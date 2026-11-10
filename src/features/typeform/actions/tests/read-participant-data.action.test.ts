import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@/generated/prisma/client";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), session: vi.fn(), user: vi.fn(), allowed: vi.fn(), member: vi.fn(), form: vi.fn(),
  remoteForm: vi.fn(), responses: vi.fn(), audit: vi.fn(), winners: vi.fn(), verification: vi.fn(),
  transaction: vi.fn(), write: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: mocks.auth } } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
vi.mock("@/features/admin/audit/services/audit-log.service", () => ({ createAuditLog: mocks.audit }));
vi.mock("../../services/load-winner-responses", () => ({ getWinnerResponsesByToken: mocks.responses }));
vi.mock("../../services/typeform.service", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../services/typeform.service")>(), getTypeformForm: mocks.remoteForm,
}));
vi.mock("@/lib/prisma", () => {
  const writes = { create: mocks.write, update: mocks.write, upsert: mocks.write, delete: mocks.write,
    createMany: mocks.write, updateMany: mocks.write, deleteMany: mocks.write };
  return { prisma: {
    session: { findUnique: mocks.session }, user: { findUnique: mocks.user }, allowedUser: { findFirst: mocks.allowed },
    userWorkspace: { findUnique: mocks.member }, form: { findUnique: mocks.form, ...writes },
    formWinner: { findMany: mocks.winners, ...writes }, verification: { findUnique: mocks.verification, ...writes },
    $transaction: mocks.transaction,
  } };
});

// Wrapper, guard, emisión de grant y mapper reales: no sustituir la seguridad
// por un guard simulado que pudiera volver a permitir consultar candidatos.
import { readParticipantDataAction } from "../winner-reveal.action";
import { issueWinnerRevealGrant } from "../../services/winner-reveal.service";

const user = { id: "user", email: "editor@example.test", name: "Editor", globalRole: "USER" as const, status: "ACTIVE" as const };
const session = { id: "session", userId: user.id, expiresAt: new Date("2099-01-01") };
const localForm = { id: "local-form", typeformId: "form", workspaceId: "workspace", workspace: {
  id: "workspace", typeformId: "remote-workspace", name: "Radio", createdFromApp: true,
} };
const winner = { responseToken: "winner", participantEmail: "winner@example.test", selectedAt: new Date("2026-11-01"), reason: "Selección manual autorizada" };
const raw = { token: "winner", answers: [{ field: { ref: "nombre" }, type: "text", text: "NOMBRE-PRIVADO" }], hidden: { secreto: "HIDDEN-PRIVADO" } };
let flowToken: string;
let record: { id: string; identifier: string; value: string; expiresAt: Date };

beforeEach(async () => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: user.id }, session: { id: session.id } });
  mocks.session.mockResolvedValue(session);
  mocks.user.mockResolvedValue(user);
  mocks.allowed.mockResolvedValue({ id: "allowed" });
  mocks.member.mockResolvedValue({ role: "EDITOR" });
  mocks.form.mockResolvedValue(localForm);
  mocks.winners.mockResolvedValue([winner]);
  mocks.remoteForm.mockResolvedValue({ id: "form", title: "Concurso", workspace: { href: "https://api.typeform.com/workspaces/remote-workspace" } });
  mocks.responses.mockResolvedValue(new Map([[raw.token, raw]]));
  const tx = { formWinner: { findMany: mocks.winners }, verification: { create: async ({ data }: { data: typeof record }) => { record = data; } } };
  ({ flowToken } = await issueWinnerRevealGrant(tx as unknown as Prisma.TransactionClient, { user, session }, "workspace", "form", "local-form", [winner.responseToken]));
  mocks.verification.mockImplementation(async ({ where }: { where: { id: string } }) => where.id === record.id ? record : null);
  mocks.winners.mockClear();
});

const read = (token = "winner", grant = flowToken) => readParticipantDataAction("workspace", "form", grant, token);
function expectDenied(result: Awaited<ReturnType<typeof read>>) {
  expect(result).toMatchObject({ status: "denied", message: expect.any(String) });
  expect(JSON.stringify(result)).not.toMatch(/NOMBRE-PRIVADO|HIDDEN-PRIVADO|SECRET|@example/);
}

describe("readParticipantDataAction: compatibilidad sin bypass", () => {
  it("exige grant emitido para un ganador confirmado y conserva auditoría, usuario, motivo y TTL", async () => {
    expect(await read()).toMatchObject({ status: "revealed", expiresAt: record.expiresAt.toISOString(), contact: winner.participantEmail,
      response: { token: "winner", visibility: "winner", answers: [{ value: "NOMBRE-PRIVADO", masked: false }], hidden: [{ value: "HIDDEN-PRIVADO", masked: false }] } });
    expect(mocks.responses).toHaveBeenCalledExactlyOnceWith("form", ["winner"]);
    expect(mocks.verification).toHaveBeenCalledTimes(3);
    expect(mocks.auth).toHaveBeenCalledWith(expect.objectContaining({ query: { disableCookieCache: true } }));
    expect(mocks.audit).toHaveBeenCalledExactlyOnceWith({ action: "SENSITIVE_DATA_VIEWED", actor: user, required: true,
      target: { type: "form_winner_data", id: "form" }, context: {
        workspaceId: "workspace", workspaceName: "Radio", formId: "form", formTitle: "Concurso",
        metadata: { displayedResponses: 1, revealedTokens: "winner", scope: "winner_modal", reason: winner.reason },
      } });
    expect(mocks.write).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(JSON.stringify(mocks.audit.mock.calls)).not.toMatch(/NOMBRE-PRIVADO|HIDDEN-PRIVADO|winner@example/);
  });

  it.each(["", "no-es-un-grant", "A".repeat(43)])("deniega grant ausente, falso o no emitido: %j", async (grant) => {
    expectDenied(await read("winner", grant));
    expect(mocks.responses).not.toHaveBeenCalled();
    expect(mocks.remoteForm).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("no permite candidatos ajenos a la selección aunque el grant sea real", async () => {
    expectDenied(await read("candidate"));
    expect(mocks.responses).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  const losses = {
    "sin formulario local": () => mocks.form.mockResolvedValue(null),
    "sin ganadores": () => mocks.winners.mockResolvedValue([]),
    "ganador sustituido": () => mocks.winners.mockResolvedValue([{ ...winner, responseToken: "candidate" }]),
    "revisión cambiada": () => mocks.winners.mockResolvedValue([{ ...winner, selectedAt: new Date() }]),
    "permiso revocado": () => mocks.verification.mockResolvedValue(null),
    "permiso caducado": () => { record.expiresAt = new Date(0); },
    "sin sesión": () => mocks.auth.mockResolvedValue(null),
    "sesión eliminada": () => mocks.session.mockResolvedValue(null),
    "sesión caducada": () => mocks.session.mockResolvedValue({ ...session, expiresAt: new Date(0) }),
    "otra sesión": () => { mocks.auth.mockResolvedValue({ user, session: { id: "other" } }); mocks.session.mockResolvedValue({ ...session, id: "other" }); },
    "otro usuario": () => { mocks.user.mockResolvedValue({ ...user, id: "other" }); mocks.session.mockResolvedValue({ ...session, userId: "other" }); },
    "usuario inactivo": () => mocks.user.mockResolvedValue({ ...user, status: "REJECTED" }),
    "sin whitelist": () => mocks.allowed.mockResolvedValue(null),
    "lector": () => mocks.member.mockResolvedValue({ role: "VIEWER" }),
    "sin membresía": () => mocks.member.mockResolvedValue(null),
    "workspace externo": () => mocks.form.mockResolvedValue({ ...localForm, workspace: { ...localForm.workspace, createdFromApp: false } }),
    "formulario movido": () => mocks.form.mockResolvedValue({ ...localForm, workspaceId: "foreign" }),
  };

  it.each(Object.entries(losses))("deniega antes de leer el proveedor: %s", async (_name, lose) => {
    lose();
    expectDenied(await read());
    expect(mocks.responses).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  describe.each(["proveedor", "auditoría"])("revalidación durante %s", (stage) => {
    it.each(Object.entries(losses))("no entrega datos tras perder %s", async (_name, lose) => {
      if (stage === "proveedor") mocks.responses.mockImplementationOnce(async () => { lose(); return new Map([[raw.token, raw]]); });
      else mocks.audit.mockImplementationOnce(async () => { lose(); });
      expectDenied(await read());
      if (stage === "proveedor") expect(mocks.audit).not.toHaveBeenCalled();
      else expect(mocks.audit).toHaveBeenCalledOnce();
    });
  });

  it("SUPER_ADMIN tampoco puede omitir el permiso ni consultar un no ganador", async () => {
    mocks.user.mockResolvedValue({ ...user, globalRole: "SUPER_ADMIN" });
    mocks.member.mockResolvedValue(null);
    expectDenied(await read("winner", ""));
    expectDenied(await read("candidate"));
    expect(mocks.responses).not.toHaveBeenCalled();
    expect(await read()).toMatchObject({ status: "revealed" });
  });

  it.each(["workspace", "form"])("no reutiliza un grant para otro %s", async (scope) => {
    expectDenied(await readParticipantDataAction(scope === "workspace" ? "foreign" : "workspace", scope === "form" ? "foreign" : "form", flowToken, "winner"));
    expect(mocks.responses).not.toHaveBeenCalled();
  });

  it.each(["proveedor", "auditoría"])("no devuelve datos ni errores privados si falla %s", async (stage) => {
    (stage === "proveedor" ? mocks.responses : mocks.audit).mockRejectedValueOnce(new Error("SECRET-PII"));
    expectDenied(await read());
  });

  it.each([new Map(), new Map([["winner", { ...raw, token: "candidate" }]])])("no revela respuestas ausentes o con token distinto", async (responses) => {
    mocks.responses.mockResolvedValueOnce(responses);
    expectDenied(await read());
    expect(mocks.audit).not.toHaveBeenCalled();
  });
});