import { beforeEach, describe, expect, it, vi } from "vitest";

// Se ejecuta el guard real, no un actor autorizado fijo: las revocaciones se
// reflejan en sus lecturas de sesión/usuario/whitelist y en las de la transacción.
const mocks = vi.hoisted(() => ({
  authSession: vi.fn(), context: vi.fn(), user: vi.fn(), session: vi.fn(), allowed: vi.fn(),
  workspace: vi.fn(), membership: vi.fn(), form: vi.fn(), transaction: vi.fn(),
  txUser: vi.fn(), txSession: vi.fn(), txAllowed: vi.fn(), txWorkspace: vi.fn(),
  txMembership: vi.fn(), txForm: vi.fn(), upsertForm: vi.fn(), query: vi.fn(),
  deleteWinners: vi.fn(), upsertWinner: vi.fn(), winners: vi.fn(),
  deleteGrants: vi.fn(), createGrant: vi.fn(),
  remoteForm: vi.fn(), resolveWorkspace: vi.fn(), responses: vi.fn(),
  audit: vi.fn(), cookies: vi.fn(), cookie: vi.fn(), revalidate: vi.fn(), rethrow: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: mocks.authSession } } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers(), cookies: mocks.cookies }));
vi.mock("next/navigation", () => ({
  redirect: (path: string): never => { throw Object.assign(new Error("NEXT_REDIRECT"), { path }); },
  unstable_rethrow: mocks.rethrow,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/features/admin/workspaces/services/workspace-access", () => ({ getWorkspaceAccessContext: mocks.context }));
vi.mock("@/features/admin/audit/services/audit-log.service", () => ({ createAuditLog: mocks.audit }));
vi.mock("@/features/typeform/services/typeform.service", () => ({
  getTypeformForm: mocks.remoteForm, resolveWorkspaceTypeformId: mocks.resolveWorkspace,
  formBelongsToWorkspace: (form: { workspace: { href: string } }, id: string) => form.workspace.href.endsWith(`/${id}`),
  getTypeformFormResponses: mocks.responses,
  getTypeformResponseParticipantEmail: () => "winner@example.test",
}));
vi.mock("@/lib/prisma", () => ({ prisma: {
  user: { findUnique: mocks.user }, session: { findUnique: mocks.session },
  allowedUser: { findFirst: mocks.allowed }, workspace: { findUnique: mocks.workspace },
  userWorkspace: { findUnique: mocks.membership }, form: { findUnique: mocks.form },
  $transaction: mocks.transaction,
} }));

import { confirmWinnersForRevealAction, selectWinnersAction } from "../select-winners.action";

const USER = { id: "editor", name: "Editor", email: "Editor@example.test", status: "ACTIVE", globalRole: "USER" };
const SESSION = { id: "session", userId: USER.id, expiresAt: new Date("2099-01-01") };
const WORKSPACE = { id: "workspace", typeformId: "remote-workspace", name: "Radio", createdFromApp: true, role: "EDITOR" };
const FORM = { id: "remote-form", title: "Concurso", workspace: { href: "https://api.typeform.com/workspaces/remote-workspace" } };
const LOCAL_FORM = { id: "local-form", typeformId: FORM.id, workspaceId: WORKSPACE.id };
const PAGE = { total_items: 1, page_count: 1, items: [{ token: "winner", response_id: "winner" }] };
const PATH = `/workspaces/${WORKSPACE.id}/forms/${FORM.id}/responses`;
const tx = {
  user: { findUnique: mocks.txUser }, session: { findUnique: mocks.txSession },
  allowedUser: { findFirst: mocks.txAllowed }, workspace: { findUnique: mocks.txWorkspace },
  userWorkspace: { findUnique: mocks.txMembership },
  form: { upsert: mocks.upsertForm, findUnique: mocks.txForm },
  formWinner: { deleteMany: mocks.deleteWinners, upsert: mocks.upsertWinner, findMany: mocks.winners },
  verification: { deleteMany: mocks.deleteGrants, create: mocks.createGrant }, $queryRaw: mocks.query,
};
type Flow = "legacy" | "confirm";
function submit(clear = false) {
  const data = new FormData();
  if (!clear) data.set("winnerToken", "winner");
  data.set("reason", "Selección manual");
  return data;
}
function invoke(flow: Flow, clear = false) {
  return flow === "legacy"
    ? selectWinnersAction(WORKSPACE.id, FORM.id, submit(clear))
    : confirmWinnersForRevealAction(WORKSPACE.id, FORM.id, submit(clear));
}
async function denied(flow: Flow, pending = invoke(flow)) {
  if (flow === "legacy") await expect(pending).rejects.toMatchObject({ message: "NEXT_REDIRECT", path: `${PATH}?winnerError=forbidden` });
  else await expect(pending).resolves.toMatchObject({ status: "denied" });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe.each<Flow>(["legacy", "confirm"])("autorización vigente de selección: %s", (flow) => {
  let live: {
    user: typeof USER | null; session: typeof SESSION | null;
    membership: { role: string } | null; allowed: { id: string } | null;
    workspace: typeof WORKSPACE | null;
  };
  let committed: { tokens: string[]; grants: string[] };
  let staged: typeof committed;

  beforeEach(() => {
    vi.resetAllMocks();
    live = { user: { ...USER }, session: { ...SESSION }, membership: { role: "EDITOR" }, allowed: { id: "allowed" }, workspace: { ...WORKSPACE } };
    committed = { tokens: ["previous"], grants: ["previous-grant"] };
    staged = structuredClone(committed);
    mocks.context.mockResolvedValue({ user: USER, workspace: WORKSPACE });
    // El proveedor puede conservar contexto de auth, pero el guard real relee BD.
    mocks.authSession.mockResolvedValue({ user: USER, session: SESSION });
    for (const mock of [mocks.user, mocks.txUser]) mock.mockImplementation(async () => live.user);
    for (const mock of [mocks.session, mocks.txSession]) mock.mockImplementation(async () => live.session);
    for (const mock of [mocks.allowed, mocks.txAllowed]) mock.mockImplementation(async () => live.allowed);
    for (const mock of [mocks.workspace, mocks.txWorkspace]) mock.mockImplementation(async () => live.workspace);
    for (const mock of [mocks.membership, mocks.txMembership]) mock.mockImplementation(async () => live.membership);
    mocks.form.mockResolvedValue(LOCAL_FORM);
    mocks.txForm.mockResolvedValue(LOCAL_FORM);
    mocks.upsertForm.mockResolvedValue(LOCAL_FORM);
    mocks.query.mockResolvedValue([]);
    mocks.remoteForm.mockResolvedValue(FORM);
    mocks.resolveWorkspace.mockResolvedValue(WORKSPACE.typeformId);
    mocks.responses.mockResolvedValue(PAGE);
    mocks.deleteGrants.mockImplementation(async () => { staged.grants = []; });
    mocks.createGrant.mockImplementation(async ({ data }) => { staged.grants.push(data.id); return data; });
    mocks.deleteWinners.mockImplementation(async () => { staged.tokens = []; });
    mocks.upsertWinner.mockImplementation(async ({ create }) => { staged.tokens.push(create.responseToken); return create; });
    mocks.winners.mockImplementation(async () => staged.tokens.map((responseToken) => ({ responseToken, selectedAt: new Date() })));
    // Doble lógico de commit/rollback, no sustituto de un motor PostgreSQL.
    mocks.transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => {
      staged = structuredClone(committed);
      const result = await callback(tx);
      committed = structuredClone(staged);
      return result;
    });
    mocks.cookies.mockResolvedValue({ set: mocks.cookie });
    mocks.rethrow.mockImplementation((error) => {
      if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    });
  });

  function unchanged() {
    expect(committed).toEqual({ tokens: ["previous"], grants: ["previous-grant"] });
    expect(mocks.audit).not.toHaveBeenCalled();
    expect(mocks.cookie).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
    expect(mocks.createGrant).not.toHaveBeenCalled();
  }

  const revocations = ["usuario", "sesión", "caducidad", "membresía", "rol", "whitelist", "workspace"] as const;
  function revoke(kind: typeof revocations[number]) {
    if (kind === "usuario") live.user = { ...USER, status: "REJECTED" };
    if (kind === "sesión") live.session = null;
    if (kind === "caducidad") live.session = { ...SESSION, expiresAt: new Date(0) };
    if (kind === "membresía") live.membership = null;
    if (kind === "rol") live.membership = { role: "VIEWER" };
    if (kind === "whitelist") live.allowed = null;
    if (kind === "workspace") live.workspace = { ...WORKSPACE, createdFromApp: false };
  }

  it.each(revocations)("rechaza revocación de %s mientras espera respuestas de Typeform", async (kind) => {
    const started = deferred<void>();
    const remote = deferred<typeof PAGE>();
    mocks.responses.mockImplementationOnce(() => { started.resolve(); return remote.promise; });
    const pending = invoke(flow);
    const assertion = denied(flow, pending);
    await started.promise;
    revoke(kind);
    remote.resolve(PAGE);
    await assertion;
    expect(mocks.transaction).not.toHaveBeenCalled();
    unchanged();
  });

  it.each(revocations)("rechaza revocación de %s durante el lock del formulario", async (kind) => {
    const locked = deferred<void>();
    const release = deferred<unknown[]>();
    mocks.query.mockImplementationOnce(() => { locked.resolve(); return release.promise; });
    const pending = invoke(flow);
    const assertion = denied(flow, pending);
    await locked.promise;
    revoke(kind);
    release.resolve([]);
    await assertion;
    expect(mocks.deleteWinners).not.toHaveBeenCalled();
    expect(mocks.upsertWinner).not.toHaveBeenCalled();
    unchanged();
  });

  it("revalida tras los metadatos remotos incluso al limpiar sin leer respuestas", async () => {
    mocks.remoteForm.mockImplementationOnce(async () => { live.session = null; return FORM; });
    await denied(flow, invoke(flow, true));
    expect(mocks.responses).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
    unchanged();
  });

  it.each([
    ["usuario eliminado", mocks.txUser, null],
    ["usuario inactivo", mocks.txUser, { ...USER, status: "PENDING" }],
    ["sesión eliminada", mocks.txSession, null],
    ["sesión de otro usuario", mocks.txSession, { ...SESSION, userId: "other" }],
    ["sesión expirada", mocks.txSession, { ...SESSION, expiresAt: new Date(0) }],
    ["membresía eliminada", mocks.txMembership, null],
    ["rol VIEWER", mocks.txMembership, { role: "VIEWER" }],
    ["whitelist eliminada", mocks.txAllowed, null],
    ["workspace eliminado", mocks.txWorkspace, null],
    ["workspace fuera del ámbito", mocks.txWorkspace, { ...WORKSPACE, createdFromApp: false }],
    ["workspace remoto distinto", mocks.txWorkspace, { ...WORKSPACE, typeformId: "other" }],
    ["formulario movido", mocks.txForm, { ...LOCAL_FORM, workspaceId: "other" }],
    ["formulario remoto distinto", mocks.txForm, { ...LOCAL_FORM, typeformId: "other" }],
  ] as const)("usa el estado transaccional aunque fuera siga autorizado: %s", async (_label, mock, value) => {
    mock.mockResolvedValue(value);
    await denied(flow);
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "ReadCommitted" });
    expect(mocks.deleteWinners).not.toHaveBeenCalled();
    expect(mocks.upsertWinner).not.toHaveBeenCalled();
    unchanged();
  });

  it("el rol SUPER_ADMIN cacheado no sobrevive a una degradación en la transacción", async () => {
    live.user = { ...USER, globalRole: "SUPER_ADMIN" };
    live.membership = null;
    mocks.txUser.mockResolvedValue(USER);
    await denied(flow);
    unchanged();
  });

  it("requiere el mismo usuario que el contexto, también con SUPER_ADMIN vivo", async () => {
    live.user = { ...USER, id: "other", globalRole: "SUPER_ADMIN" };
    live.session = { ...SESSION, userId: "other" };
    await denied(flow);
    expect(mocks.transaction).not.toHaveBeenCalled();
    unchanged();
  });

  it("rechaza cambiar de sesión mientras espera Typeform", async () => {
    mocks.responses.mockImplementationOnce(async () => {
      live.session = { ...SESSION, id: "other-session" };
      mocks.authSession.mockResolvedValue({ user: USER, session: live.session });
      return PAGE;
    });
    await denied(flow);
    expect(mocks.transaction).not.toHaveBeenCalled();
    unchanged();
  });

  it("no usa el rol EDITOR cacheado si ya falta la membresía", async () => {
    live.membership = null;
    await denied(flow);
    expect(mocks.remoteForm).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
    unchanged();
  });

  it("permite SUPER_ADMIN vivo sin membresía ni whitelist", async () => {
    live.user = { ...USER, globalRole: "SUPER_ADMIN" };
    live.membership = null;
    live.allowed = null;
    if (flow === "confirm") await expect(invoke(flow)).resolves.toMatchObject({ status: "confirmed", winnerCount: 1 });
    else await expect(invoke(flow)).rejects.toMatchObject({ path: `${PATH}?page=1&pageSize=20&winnerSelection=1` });
    expect(committed.tokens).toEqual(["winner"]);
    expect(mocks.txAllowed).not.toHaveBeenCalled();
    expect(mocks.txMembership).not.toHaveBeenCalled();
  });

  it.each(["antes de Typeform", "dentro de la transacción"])("también exige createdFromApp a SUPER_ADMIN: %s", async (stage) => {
    live.user = { ...USER, globalRole: "SUPER_ADMIN" };
    if (stage === "antes de Typeform") live.workspace = { ...WORKSPACE, createdFromApp: false };
    else mocks.txWorkspace.mockResolvedValue({ ...WORKSPACE, createdFromApp: false });
    await denied(flow);
    if (stage === "antes de Typeform") expect(mocks.remoteForm).not.toHaveBeenCalled();
    expect(mocks.upsertWinner).not.toHaveBeenCalled();
    unchanged();
  });

  it("no acepta un contexto cacheado cuando ya no hay sesión autenticada", async () => {
    mocks.authSession.mockResolvedValue(null);
    await denied(flow);
    expect(mocks.remoteForm).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
    unchanged();
  });

  it("adquiere locks que bloquean UPDATE/DELETE antes de escribir ganadores", async () => {
    if (flow === "confirm") await expect(invoke(flow)).resolves.toMatchObject({ status: "confirmed" });
    else await expect(invoke(flow)).rejects.toMatchObject({ message: "NEXT_REDIRECT" });
    const locks = mocks.query.mock.calls.map(([strings]) => (strings as TemplateStringsArray).join("?"));
    expect(locks).toEqual([
      'SELECT "id" FROM "form" WHERE "id" = ? FOR UPDATE',
      'SELECT "id" FROM "user" WHERE "id" = ? FOR SHARE',
      'SELECT "id" FROM "session" WHERE "id" = ? FOR SHARE',
      'SELECT "id" FROM "workspace" WHERE "id" = ? FOR SHARE',
      'SELECT "id" FROM "user_workspace" WHERE "userId" = ? AND "workspaceId" = ? FOR SHARE',
      'SELECT "id" FROM "alloweduser" WHERE LOWER("email") = LOWER(?) FOR SHARE',
    ]);
    const writeOrder = mocks.deleteWinners.mock.invocationCallOrder[0];
    expect(mocks.query.mock.invocationCallOrder.every((order) => order < writeOrder)).toBe(true);
    expect(mocks.authSession).toHaveBeenCalledTimes(3);
    for (const [options] of mocks.authSession.mock.calls) expect(options.query).toEqual({ disableCookieCache: true });
    if (flow === "legacy") expect(mocks.createGrant).not.toHaveBeenCalled();
    else {
      const record = mocks.createGrant.mock.calls[0][0].data;
      expect(JSON.parse(record.value)).toMatchObject({ userId: USER.id, sessionId: SESSION.id, workspaceId: WORKSPACE.id });
    }
  });

  it("limpiar selección mantiene revocación atómica sin consultar respuestas", async () => {
    if (flow === "confirm") await expect(invoke(flow, true)).resolves.toEqual({ status: "confirmed", winnerCount: 0, grant: null });
    else await expect(invoke(flow, true)).rejects.toMatchObject({ message: "NEXT_REDIRECT" });
    expect(committed).toEqual({ tokens: [], grants: [] });
    expect(mocks.responses).not.toHaveBeenCalled();
    expect(mocks.createGrant).not.toHaveBeenCalled();
    expect(mocks.audit).toHaveBeenCalledOnce();
  });

  it("revierte selección y revocación si la sesión expira durante la escritura", async () => {
    const expiry = new Date(Date.now() + 60_000);
    mocks.txSession.mockResolvedValue({ ...SESSION, expiresAt: expiry });
    mocks.upsertWinner.mockImplementationOnce(async () => { expiry.setTime(0); });
    await denied(flow);
    unchanged();
  });

  it("no captura ni convierte los redirects internos de Next", async () => {
    const error = Object.assign(new Error("NEXT_REDIRECT"), { path: "/auth/login" });
    mocks.context.mockRejectedValue(error);
    await expect(invoke(flow)).rejects.toBe(error);
    expect(mocks.rethrow).toHaveBeenCalledWith(error);
    unchanged();
  });
});