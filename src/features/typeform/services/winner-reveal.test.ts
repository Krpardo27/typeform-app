import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@/generated/prisma/client";

type Stored = { id: string; identifier: string; value: string; expiresAt: Date };
const mocks = vi.hoisted(() => ({
  auth: vi.fn(), session: vi.fn(), user: vi.fn(), allowed: vi.fn(), form: vi.fn(), member: vi.fn(), winners: vi.fn(),
  read: vi.fn(), create: vi.fn(), deletion: vi.fn(), lock: vi.fn(), record: null as Stored | null,
}));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: mocks.auth } } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  session: { findUnique: mocks.session }, user: { findUnique: mocks.user }, allowedUser: { findFirst: mocks.allowed },
  form: { findUnique: mocks.form }, userWorkspace: { findUnique: mocks.member }, formWinner: { findMany: mocks.winners },
  verification: { findUnique: mocks.read, deleteMany: mocks.deletion },
} }));

import { finishWinnerReveal, getWinnerRevealActor, issueWinnerRevealGrant, requireWinnerRevealGrant, revokeWinnerRevealGrants, WINNER_REVEAL_TTL_MS } from "./winner-reveal.service";

const user = { id: "user", email: "editor@example.test", name: "Editor", globalRole: "USER" as const, status: "ACTIVE" as const };
const form = { id: "local-form", typeformId: "remote-form", workspaceId: "workspace", workspace: { id: "workspace", typeformId: "remote-workspace", name: "Radio", createdFromApp: true } };
let token: string;
const tx = {
  $queryRaw: mocks.lock, verification: { create: mocks.create, deleteMany: mocks.deletion },
  formWinner: { findMany: mocks.winners },
} as unknown as Prisma.TransactionClient;

beforeEach(async () => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-06T12:00:00Z"));
  const session = { id: "session", userId: user.id, expiresAt: new Date(Date.now() + 600_000) };
  mocks.auth.mockResolvedValue({ user: { id: user.id }, session: { id: session.id } });
  mocks.session.mockResolvedValue(session);
  mocks.user.mockResolvedValue(user);
  mocks.allowed.mockResolvedValue({ id: "allowed" });
  mocks.form.mockResolvedValue(form);
  mocks.member.mockResolvedValue({ role: "EDITOR" });
  mocks.winners.mockResolvedValue([{ responseToken: "a", participantEmail: "private@example.test", selectedAt: new Date(), reason: "Sorteo" }]);
  mocks.create.mockImplementation(async ({ data }: { data: Stored }) => { mocks.record = { ...data }; return data; });
  mocks.read.mockImplementation(async ({ where }: { where: { id: string } }) => mocks.record?.id === where.id ? mocks.record : null);
  mocks.deletion.mockImplementation(async ({ where }: { where: { id?: string; identifier?: string } }) => {
    if (mocks.record && (!where.id || mocks.record.id === where.id) && (!where.identifier || mocks.record.identifier === where.identifier)) mocks.record = null;
    return { count: 1 };
  });
  token = (await issueWinnerRevealGrant(tx, { user, session }, "workspace", "remote-form", "local-form", ["a"])).flowToken;
});
afterEach(() => vi.useRealTimers());

function requireGrant(flowToken = token, workspace = "workspace", formId = "remote-form") {
  return requireWinnerRevealGrant(flowToken, workspace, formId);
}

describe("permiso temporal de lectura de ganadores", () => {
  it("usa secreto opaco solo en memoria del cliente y hash en servidor, sin almacenar respuestas ni contactos", async () => {
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(mocks.record!.id).toBe(`winner-reveal:v1:${createHash("sha256").update(token).digest("hex")}`);
    expect(mocks.record!.value).not.toContain(token);
    expect(mocks.record!.value).not.toContain("private@example.test");
    expect(mocks.record!.value).not.toContain(user.email);
    expect(mocks.record!.expiresAt.getTime() - Date.now()).toBe(WINNER_REVEAL_TTL_MS);
    expect((await requireGrant()).grant.responseTokens).toEqual(["a"]);
    expect(mocks.auth).toHaveBeenCalledWith(expect.objectContaining({ query: { disableCookieCache: true } }));
  });

  it("ganadores persistidos sin permiso no autorizan ninguna lectura", async () => {
    mocks.record = null;
    await expect(requireGrant()).rejects.toThrow(/Vuelve a consultar/);
  });

  it.each(["", "cookie-json", "A".repeat(42), "A".repeat(44)])("rechaza tokens malformados: %s", async (value) => {
    await expect(requireGrant(value)).rejects.toThrow();
    expect(mocks.auth).not.toHaveBeenCalled();
  });

  it("un secreto distinto no encuentra la autorización", async () => {
    await expect(requireGrant("X".repeat(43))).rejects.toThrow();
  });

  it.each(["sin sesión", "sesión eliminada", "sesión caducada", "usuario rechazado", "sin whitelist", "rol lector"])("revalida identidad y permisos actuales: %s", async (scenario) => {
    if (scenario === "sin sesión") mocks.auth.mockResolvedValueOnce(null);
    if (scenario === "sesión eliminada") mocks.session.mockResolvedValueOnce(null);
    if (scenario === "sesión caducada") mocks.session.mockResolvedValueOnce({ id: "session", userId: user.id, expiresAt: new Date(Date.now() - 1) });
    if (scenario === "usuario rechazado") mocks.user.mockResolvedValueOnce({ ...user, status: "REJECTED" });
    if (scenario === "sin whitelist") mocks.allowed.mockResolvedValueOnce(null);
    if (scenario === "rol lector") mocks.member.mockResolvedValueOnce({ role: "VIEWER" });
    await expect(requireGrant()).rejects.toThrow();
  });

  it("no permite otra sesión del mismo usuario", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: user.id }, session: { id: "another-session" } });
    mocks.session.mockResolvedValueOnce({ id: "another-session", userId: user.id, expiresAt: new Date(Date.now() + 600_000) });
    await expect(requireGrant()).rejects.toThrow();
  });

  it("no permite otro usuario aunque tenga un rol válido", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: "other" }, session: { id: "other-session" } });
    mocks.user.mockResolvedValueOnce({ ...user, id: "other" });
    mocks.session.mockResolvedValueOnce({ id: "other-session", userId: "other", expiresAt: new Date(Date.now() + 600_000) });
    await expect(requireGrant()).rejects.toThrow();
  });

  it.each([["foreign-workspace", "remote-form"], ["workspace", "foreign-form"]])("el permiso no sirve en otro ámbito %s/%s", async (workspace, formId) => {
    await expect(requireGrant(token, workspace, formId)).rejects.toThrow();
  });

  it("acepta el alias remoto del workspace, pero nunca reasigna el formulario", async () => {
    expect((await requireGrant(token, "remote-workspace")).form.id).toBe("local-form");
    mocks.form.mockResolvedValueOnce({ ...form, workspaceId: "foreign" });
    await expect(requireGrant()).rejects.toThrow();
  });

  it("no admite workspaces externos a la aplicación", async () => {
    mocks.form.mockResolvedValueOnce({ ...form, workspace: { ...form.workspace, createdFromApp: false } });
    await expect(requireGrant()).rejects.toThrow();
  });

  it.each(["retirada", "añadido", "reconfirmada"])("un cambio de selección invalida un permiso anterior: %s", async (change) => {
    if (change === "retirada") mocks.winners.mockResolvedValueOnce([]);
    if (change === "añadido") mocks.winners.mockResolvedValueOnce([{ responseToken: "a", selectedAt: new Date() }, { responseToken: "b", selectedAt: new Date() }]);
    if (change === "reconfirmada") mocks.winners.mockResolvedValueOnce([{ responseToken: "a", selectedAt: new Date(Date.now() + 1) }]);
    await expect(requireGrant()).rejects.toThrow();
  });

  it("un JSON inválido o alterado en servidor no concede acceso", async () => {
    const record = { ...mocks.record! };
    mocks.record!.value = "invalid";
    await expect(requireGrant()).rejects.toThrow();
    mocks.record = { ...record, value: JSON.stringify({ ...JSON.parse(record.value), sessionId: "forged" }) };
    await expect(requireGrant()).rejects.toThrow();
  });

  it("el plazo no se renueva al consultar y no supera la sesión", async () => {
    const before = mocks.record!.expiresAt.getTime();
    await requireGrant();
    expect(mocks.record!.expiresAt.getTime()).toBe(before);
    const grant = await issueWinnerRevealGrant(tx, { user, session: { id: "session", userId: user.id, expiresAt: new Date(Date.now() + 10_000) } }, "workspace", "remote-form", "local-form", ["a"]);
    expect(Date.parse(grant.expiresAt) - Date.now()).toBe(10_000);
    vi.advanceTimersByTime(10_001);
    await expect(requireGrant(grant.flowToken)).rejects.toThrow();
  });

  it("cerrar revoca el permiso y un replay del mismo secreto es rechazado", async () => {
    await finishWinnerReveal(token, "workspace", "remote-form");
    expect(mocks.record).toBeNull();
    await expect(requireGrant()).rejects.toThrow();
    await expect(finishWinnerReveal(token, "workspace", "remote-form")).resolves.toBeUndefined();
  });

  it("el dueño puede revocar incluso si perdió whitelist o rol", async () => {
    mocks.allowed.mockResolvedValue(null);
    mocks.member.mockResolvedValue({ role: "VIEWER" });
    await finishWinnerReveal(token, "workspace", "remote-form");
    expect(mocks.record).toBeNull();
  });

  it("otra sesión no puede revocar el permiso del dueño", async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: user.id }, session: { id: "other-session" } });
    await finishWinnerReveal(token, "workspace", "remote-form");
    expect(mocks.record).not.toBeNull();
  });

  it("seleccionar de nuevo bloquea el formulario y revoca los permisos de ese ámbito", async () => {
    await revokeWinnerRevealGrants(tx, "workspace", "remote-form", "local-form");
    expect(mocks.lock).toHaveBeenCalledOnce();
    expect(mocks.deletion).toHaveBeenCalledWith({ where: { identifier: "winner-reveal:v1:workspace:remote-form" } });
    expect(mocks.lock.mock.invocationCallOrder[0]).toBeLessThan(mocks.deletion.mock.invocationCallOrder[0]);
    await expect(requireGrant()).rejects.toThrow();
  });

  it("un superadministrador activo conserva permiso, pero también necesita un flujo", async () => {
    mocks.user.mockResolvedValue({ ...user, globalRole: "SUPER_ADMIN" });
    mocks.allowed.mockResolvedValue(null);
    expect((await getWinnerRevealActor()).user.globalRole).toBe("SUPER_ADMIN");
    expect((await requireGrant()).grant.userId).toBe(user.id);
  });
});