import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Stored = { id: string; identifier: string; value: string; expiresAt: Date };
const mocks = vi.hoisted(() => ({
  auth: vi.fn(), session: vi.fn(), user: vi.fn(), allowed: vi.fn(), workspace: vi.fn(), member: vi.fn(),
  form: vi.fn(), lockedForm: vi.fn(), winners: vi.fn(), lock: vi.fn(), transaction: vi.fn(), afterCommit: vi.fn(),
  verificationRead: vi.fn(), verificationCreate: vi.fn(), verificationDelete: vi.fn(),
  winnerCreate: vi.fn(), winnerUpdate: vi.fn(), winnerUpsert: vi.fn(), winnerDelete: vi.fn(),
  winnerCreateMany: vi.fn(), winnerUpdateMany: vi.fn(), winnerDeleteMany: vi.fn(), formWrite: vi.fn(),
  remoteForm: vi.fn(), resolveWorkspace: vi.fn(), responses: vi.fn(), audit: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: mocks.auth } } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
vi.mock("@/features/admin/audit/services/audit-log.service", () => ({ createAuditLog: mocks.audit }));
vi.mock("../../services/load-winner-responses", () => ({ getWinnerResponsesByToken: mocks.responses }));
vi.mock("../../services/typeform.service", () => ({
  getTypeformForm: mocks.remoteForm, resolveWorkspaceTypeformId: mocks.resolveWorkspace,
  formBelongsToWorkspace: (form: { workspace?: { href: string } }, id: string) =>
    form.workspace?.href === `https://api.typeform.com/workspaces/${id}`,
  mapMaskedTypeformResponses: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {
  session: { findUnique: mocks.session }, user: { findUnique: mocks.user }, allowedUser: { findFirst: mocks.allowed },
  workspace: { findFirst: mocks.workspace }, userWorkspace: { findUnique: mocks.member },
  form: { findUnique: mocks.form, create: mocks.formWrite, update: mocks.formWrite, upsert: mocks.formWrite },
  formWinner: { findMany: mocks.winners, create: mocks.winnerCreate, update: mocks.winnerUpdate,
    upsert: mocks.winnerUpsert, delete: mocks.winnerDelete, createMany: mocks.winnerCreateMany,
    updateMany: mocks.winnerUpdateMany, deleteMany: mocks.winnerDeleteMany },
  verification: { findUnique: mocks.verificationRead, deleteMany: mocks.verificationDelete },
  $transaction: mocks.transaction,
} }));

// Servicio de permisos real: las pruebas ejercitan identidad viva, revisión,
// almacenamiento opaco y caducidad, además del contrato de la Server Action.
import { beginSavedWinnerDataAction } from "../winner-reveal.action";
import { requireWinnerRevealGrant, WINNER_REVEAL_TTL_MS } from "../../services/winner-reveal.service";
import type { BeginWinnerData } from "../../types/winner-reveal";

const user = { id: "user", email: "editor@example.test", name: "Editor", globalRole: "USER", status: "ACTIVE" };
const localForm = { id: "local-form", typeformId: "form", workspaceId: "workspace", workspace: {
  id: "workspace", typeformId: "workspace-alias", name: "Radio", createdFromApp: true,
} };
const remoteForm = { id: "form", workspace: { href: "https://api.typeform.com/workspaces/canonical-workspace" } };
const selectedAt = new Date("2026-11-01T12:00:00Z");
let records: Map<string, Stored>;
let winners: { responseToken: string; participantEmail: string; selectedAt: Date; reason: string }[];
const tx = {
  $queryRaw: mocks.lock,
  form: { findUnique: mocks.lockedForm, create: mocks.formWrite, update: mocks.formWrite, upsert: mocks.formWrite },
  formWinner: { findMany: mocks.winners, create: mocks.winnerCreate, update: mocks.winnerUpdate,
    upsert: mocks.winnerUpsert, delete: mocks.winnerDelete, createMany: mocks.winnerCreateMany,
    updateMany: mocks.winnerUpdateMany, deleteMany: mocks.winnerDeleteMany },
  verification: { create: mocks.verificationCreate, deleteMany: mocks.verificationDelete },
};
const begin: BeginWinnerData = () => beginSavedWinnerDataAction("workspace", "form");

function expectNoSelectionWrites() {
  for (const spy of [mocks.formWrite, mocks.winnerCreate, mocks.winnerUpdate, mocks.winnerUpsert,
    mocks.winnerDelete, mocks.winnerCreateMany, mocks.winnerUpdateMany, mocks.winnerDeleteMany,
    mocks.audit, mocks.responses, mocks.verificationDelete]) expect(spy).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-09T12:00:00Z"));
  records = new Map();
  winners = ["a", "b"].map((responseToken) => ({ responseToken, selectedAt,
    participantEmail: `${responseToken}@private.test`, reason: "MOTIVO-PRIVADO" }));
  mocks.auth.mockResolvedValue({ user: { id: user.id }, session: { id: "session" } });
  mocks.session.mockResolvedValue({ id: "session", userId: user.id, expiresAt: new Date(Date.now() + 600_000) });
  mocks.user.mockResolvedValue(user);
  mocks.allowed.mockResolvedValue({ id: "allowed" });
  mocks.workspace.mockResolvedValue({ id: "workspace", typeformId: "workspace-alias" });
  mocks.member.mockResolvedValue({ role: "EDITOR" });
  mocks.form.mockResolvedValue(localForm);
  mocks.lockedForm.mockResolvedValue(localForm);
  mocks.lock.mockResolvedValue([{ id: "local-form" }]);
  mocks.winners.mockImplementation(async () => winners);
  mocks.remoteForm.mockResolvedValue(remoteForm);
  mocks.resolveWorkspace.mockResolvedValue("canonical-workspace");
  mocks.verificationCreate.mockImplementation(async ({ data }: { data: Stored }) => {
    records.set(data.id, structuredClone(data));
    return data;
  });
  mocks.verificationRead.mockImplementation(async ({ where }: { where: { id: string } }) => records.get(where.id) ?? null);
  mocks.transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => {
    const result = await callback(tx);
    await mocks.afterCommit();
    return result;
  });
});
afterEach(() => { expectNoSelectionWrites(); vi.useRealTimers(); });

describe("beginSavedWinnerDataAction", () => {
  it("consulta la selección guardada sin modificar FormWinner, selectedAt ni emitir WINNER_SELECTED", async () => {
    const before = structuredClone(winners);
    const result = await begin();
    expect(result).toEqual({ status: "ready", grant: { flowToken: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
      expiresAt: new Date(Date.now() + WINNER_REVEAL_TTL_MS).toISOString() },
    participants: [{ token: "a", label: "Ganador 1" }, { token: "b", label: "Ganador 2" }] });
    expect(winners).toEqual(before);
    expect(JSON.stringify(result)).not.toMatch(/private|MOTIVO|selectedAt|participantEmail/);
    expect(mocks.auth).toHaveBeenCalledTimes(2);
    expect(mocks.auth).toHaveBeenCalledWith(expect.objectContaining({ query: { disableCookieCache: true } }));
    expect(mocks.verificationCreate).toHaveBeenCalledOnce();
    expect(mocks.verificationRead).toHaveBeenCalledOnce();
    expect(mocks.resolveWorkspace).toHaveBeenCalledExactlyOnceWith("workspace-alias");
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.lock.mock.calls[0][0].join("?")).toContain('SELECT "id" FROM "form" WHERE "id" = ? FOR UPDATE');
    expect(mocks.lock.mock.calls[0][1]).toBe("local-form");
    expect(mocks.lock.mock.invocationCallOrder[0]).toBeLessThan(mocks.lockedForm.mock.invocationCallOrder[0]);
    expect(mocks.lock.mock.invocationCallOrder[0]).toBeLessThan(mocks.winners.mock.invocationCallOrder[0]);
    expect(mocks.winners.mock.invocationCallOrder[1]).toBeLessThan(mocks.verificationCreate.mock.invocationCallOrder[0]);
    expect(mocks.afterCommit.mock.invocationCallOrder[0]).toBeLessThan(mocks.verificationRead.mock.invocationCallOrder[0]);
  });

  it("acepta alias de workspace y mantiene el ámbito local canónico", async () => {
    expect((await beginSavedWinnerDataAction("workspace-alias", "form")).status).toBe("ready");
    expect(mocks.workspace).toHaveBeenCalledWith({ where: { createdFromApp: true,
      OR: [{ id: "workspace-alias" }, { typeformId: "workspace-alias" }] }, select: { id: true, typeformId: true, name: true } });
    expect(mocks.winners).toHaveBeenCalledWith(expect.objectContaining({ where: { formId: "local-form", workspaceId: "workspace" } }));
    expect(JSON.parse([...records.values()][0].value)).toMatchObject({ workspaceId: "workspace", formId: "local-form" });
  });

  it("permite SUPER_ADMIN vivo sin membresía ni whitelist", async () => {
    mocks.user.mockResolvedValue({ ...user, globalRole: "SUPER_ADMIN" });
    mocks.allowed.mockResolvedValue(null);
    mocks.member.mockResolvedValue(null);
    expect((await begin()).status).toBe("ready");
    expect(mocks.member).not.toHaveBeenCalled();
  });

  it.each(["sin sesión", "sesión eliminada", "sesión caducada", "usuario inactivo", "sin whitelist", "lector", "sin membresía"])("deniega actor/permisos: %s", async (scenario) => {
    if (scenario === "sin sesión") mocks.auth.mockResolvedValue(null);
    if (scenario === "sesión eliminada") mocks.session.mockResolvedValue(null);
    if (scenario === "sesión caducada") mocks.session.mockResolvedValue({ id: "session", userId: user.id, expiresAt: new Date(Date.now()) });
    if (scenario === "usuario inactivo") mocks.user.mockResolvedValue({ ...user, status: "REJECTED" });
    if (scenario === "sin whitelist") mocks.allowed.mockResolvedValue(null);
    if (scenario === "lector") mocks.member.mockResolvedValue({ role: "VIEWER" });
    if (scenario === "sin membresía") mocks.member.mockResolvedValue(null);
    expect(await begin()).toMatchObject({ status: "denied", message: expect.stringMatching(/Vuelve a consultar/) });
    expect(mocks.remoteForm).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.verificationCreate).not.toHaveBeenCalled();
  });

  it.each(["workspace ajeno o externo", "formulario inexistente", "formulario local ajeno", "formulario remoto ajeno", "id remoto distinto"])("deniega pertenencia: %s", async (scenario) => {
    if (scenario === "workspace ajeno o externo") mocks.workspace.mockResolvedValue(null);
    if (scenario === "formulario inexistente") mocks.form.mockResolvedValue(null);
    if (scenario === "formulario local ajeno") mocks.form.mockResolvedValue({ ...localForm, workspaceId: "foreign" });
    if (scenario === "formulario remoto ajeno") mocks.remoteForm.mockResolvedValue({ ...remoteForm, workspace: { href: "https://api.typeform.com/workspaces/foreign" } });
    if (scenario === "id remoto distinto") mocks.remoteForm.mockResolvedValue({ ...remoteForm, id: "foreign" });
    expect((await begin()).status).toBe("denied");
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.verificationCreate).not.toHaveBeenCalled();
  });

  it("sin formulario local deniega antes de la transacción y no emite grants", async () => {
    mocks.form.mockResolvedValue(null);
    expect(await begin()).toEqual({ status: "denied", message: expect.stringMatching(/Vuelve a consultar/) });
    expect(mocks.remoteForm).toHaveBeenCalledExactlyOnceWith("form");
    expect(mocks.resolveWorkspace).toHaveBeenCalledExactlyOnceWith("workspace-alias");
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.lock).not.toHaveBeenCalled();
    expect(mocks.winners).not.toHaveBeenCalled();
    expect(mocks.verificationCreate).not.toHaveBeenCalled();
    expect(mocks.verificationRead).not.toHaveBeenCalled();
    expect(records.size).toBe(0);
  });

  it.each(["movido", "eliminado", "externo", "id cambiado", "workspace remoto cambiado"])("revalida formulario tras adquirir el bloqueo: %s", async (scenario) => {
    if (scenario === "movido") mocks.lockedForm.mockResolvedValue({ ...localForm, workspaceId: "foreign" });
    if (scenario === "eliminado") mocks.lockedForm.mockResolvedValue(null);
    if (scenario === "externo") mocks.lockedForm.mockResolvedValue({ ...localForm, workspace: { ...localForm.workspace, createdFromApp: false } });
    if (scenario === "id cambiado") mocks.lockedForm.mockResolvedValue({ ...localForm, typeformId: "foreign" });
    if (scenario === "workspace remoto cambiado") mocks.lockedForm.mockResolvedValue({ ...localForm, workspace: { ...localForm.workspace, typeformId: "foreign" } });
    expect((await begin()).status).toBe("denied");
    expect(mocks.lock).toHaveBeenCalledOnce();
    expect(mocks.winners).not.toHaveBeenCalled();
    expect(mocks.verificationCreate).not.toHaveBeenCalled();
  });

  it("una selección vacía no emite permiso ni solicita respuestas a Typeform", async () => {
    winners = [];
    expect((await begin()).status).toBe("denied");
    expect(mocks.verificationCreate).not.toHaveBeenCalled();
    expect(mocks.lock).toHaveBeenCalledOnce();
  });

  it("lee la selección posterior a una escritura que terminó mientras esperaba el bloqueo", async () => {
    mocks.lock.mockImplementation(async () => { winners = [winners[1]]; return [{ id: "local-form" }]; });
    expect(await begin()).toMatchObject({ status: "ready", participants: [{ token: "b", label: "Ganador 1" }] });
    expect(JSON.parse([...records.values()][0].value).responseTokens).toEqual(["b"]);
  });

  it("la emisión rechaza tokens que no coincidan con la selección bloqueada", async () => {
    mocks.winners.mockResolvedValueOnce([winners[0]]);
    expect((await begin()).status).toBe("denied");
    expect(mocks.verificationCreate).not.toHaveBeenCalled();
  });

  it("un fallo al adquirir el bloqueo impide leer tokens o emitir permisos", async () => {
    mocks.lock.mockRejectedValueOnce(new Error("database unavailable"));
    expect((await begin()).status).toBe("denied");
    expect(mocks.winners).not.toHaveBeenCalled();
    expect(mocks.verificationCreate).not.toHaveBeenCalled();
  });

  it.each(["selección retirada", "selectedAt cambiado", "rol revocado", "sesión revocada", "whitelist revocada", "workspace externo", "grant revocado", "caducado"])("no devuelve permiso ni participantes si tras el commit queda %s", async (scenario) => {
    mocks.afterCommit.mockImplementation(() => {
      if (scenario === "selección retirada") winners = [];
      if (scenario === "selectedAt cambiado") winners = winners.map((winner) => ({ ...winner, selectedAt: new Date() }));
      if (scenario === "rol revocado") mocks.member.mockResolvedValue({ role: "VIEWER" });
      if (scenario === "sesión revocada") mocks.session.mockResolvedValue(null);
      if (scenario === "whitelist revocada") mocks.allowed.mockResolvedValue(null);
      if (scenario === "workspace externo") mocks.form.mockResolvedValue({ ...localForm, workspace: { ...localForm.workspace, createdFromApp: false } });
      if (scenario === "grant revocado") records.clear();
      if (scenario === "caducado") vi.advanceTimersByTime(WINNER_REVEAL_TTL_MS);
    });
    expect(await begin()).toEqual({ status: "denied", message: expect.stringMatching(/Vuelve a consultar/) });
    expect(mocks.verificationCreate).toHaveBeenCalledOnce();
    expect(mocks.afterCommit).toHaveBeenCalledOnce();
  });

  it("volver a consultar no revoca otros flujos ni extiende el plazo de uno existente", async () => {
    const first = await begin();
    vi.advanceTimersByTime(10_000);
    const second = await begin();
    expect(first.status).toBe("ready");
    expect(second.status).toBe("ready");
    if (first.status !== "ready" || second.status !== "ready") throw new Error("Se esperaba permiso");
    expect(records.size).toBe(2);
    expect(first.grant.flowToken).not.toBe(second.grant.flowToken);
    expect((await requireWinnerRevealGrant(first.grant.flowToken, "workspace", "form")).expiresAt.toISOString()).toBe(first.grant.expiresAt);
  });

  it("limita el permiso al vencimiento de la sesión sin alterar el TTL", async () => {
    mocks.session.mockResolvedValue({ id: "session", userId: user.id, expiresAt: new Date(Date.now() + 5_000) });
    expect(await begin()).toMatchObject({ status: "ready", grant: { expiresAt: new Date(Date.now() + 5_000).toISOString() } });
  });

  it("los fallos inesperados no filtran errores ni piden reconfirmar", async () => {
    mocks.remoteForm.mockRejectedValue(new Error("PII-SECRET-PROVIDER"));
    expect(await begin()).toEqual({ status: "denied", message: "No se pudo iniciar la consulta. Vuelve a consultar los ganadores guardados." });
    expect(mocks.verificationCreate).not.toHaveBeenCalled();
  });

  it.each([["", "form"], ["workspace", " "], [null, "form"], ["workspace", 123]])("rechaza argumentos inválidos %j/%j antes de consultar", async (workspace, form) => {
    expect((await beginSavedWinnerDataAction(workspace as string, form as string)).status).toBe("denied");
    expect(mocks.auth).not.toHaveBeenCalled();
  });
});