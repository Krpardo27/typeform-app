import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getWorkspaceAccessContext: vi.fn(),
  membership: vi.fn(),
  workspace: vi.fn(),
  txMembership: vi.fn(),
  txWorkspace: vi.fn(),
  txUser: vi.fn(),
  txSession: vi.fn(),
  txAllowed: vi.fn(),
  txQueryRaw: vi.fn(),
  txForm: vi.fn(),
  localForm: vi.fn(),
  outsideFormUpsert: vi.fn(),
  outsideDelete: vi.fn(),
  outsideWinnerUpsert: vi.fn(),
  transaction: vi.fn(),
  txFormUpsert: vi.fn(),
  txDelete: vi.fn(),
  txWinnerUpsert: vi.fn(),
  getTypeformForm: vi.fn(),
  resolveWorkspaceTypeformId: vi.fn(),
  formBelongsToWorkspace: vi.fn(),
  getTypeformFormResponses: vi.fn(),
  getTypeformResponseParticipantEmail: vi.fn(),
  createAuditLog: vi.fn(),
  cookies: vi.fn(),
  setCookie: vi.fn(),
  revalidatePath: vi.fn(),
  unstableRethrow: vi.fn(),
  redirect: vi.fn((path: string): never => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { path });
  }),
  revealActor: vi.fn(), issueGrant: vi.fn(), revokeGrants: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect, unstable_rethrow: mocks.unstableRethrow }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@/features/admin/workspaces/services/workspace-access", () => ({
  getWorkspaceAccessContext: mocks.getWorkspaceAccessContext,
}));
vi.mock("@/features/admin/audit/services/audit-log.service", () => ({
  createAuditLog: mocks.createAuditLog,
}));
vi.mock("@/features/typeform/services/typeform.service", () => ({
  getTypeformForm: mocks.getTypeformForm,
  resolveWorkspaceTypeformId: mocks.resolveWorkspaceTypeformId,
  formBelongsToWorkspace: mocks.formBelongsToWorkspace,
  getTypeformFormResponses: mocks.getTypeformFormResponses,
  getTypeformResponseParticipantEmail: mocks.getTypeformResponseParticipantEmail,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    userWorkspace: { findUnique: mocks.membership },
    workspace: { findUnique: mocks.workspace },
    form: { findUnique: mocks.localForm, upsert: mocks.outsideFormUpsert },
    formWinner: {
      deleteMany: mocks.outsideDelete,
      upsert: mocks.outsideWinnerUpsert,
    },
    $transaction: mocks.transaction,
  },
}));
vi.mock("../../services/winner-reveal.service", () => ({
  getWinnerRevealActor: mocks.revealActor,
  issueWinnerRevealGrant: mocks.issueGrant,
  revokeWinnerRevealGrants: mocks.revokeGrants,
  WinnerRevealDenied: class WinnerRevealDenied extends Error { constructor() { super("Consulta no disponible"); } },
}));

import { selectWinnersAction, confirmWinnersForRevealAction } from "../select-winners.action";

const WORKSPACE = {
  id: "workspace-db",
  typeformId: "workspace-alias",
  name: "Workspace",
  role: "EDITOR",
};
const USER = {
  id: "editor-id",
  email: "editor@example.test",
  globalRole: "USER",
};
const FORM = {
  id: "remote-form",
  title: "Concurso",
  workspace: { href: "https://api.typeform.com/workspaces/canonical-workspace" },
  self: { href: "https://api.typeform.com/forms/remote-form" },
};
const PATH = `/workspaces/${WORKSPACE.id}/forms/${FORM.id}/responses`;
const tx = {
  form: { upsert: mocks.txFormUpsert, findUnique: mocks.txForm },
  formWinner: { deleteMany: mocks.txDelete, upsert: mocks.txWinnerUpsert },
  userWorkspace: { findUnique: mocks.txMembership },
  workspace: { findUnique: mocks.txWorkspace },
  user: { findUnique: mocks.txUser },
  session: { findUnique: mocks.txSession },
  allowedUser: { findFirst: mocks.txAllowed },
  $queryRaw: mocks.txQueryRaw,
};

function submission(tokens = ["winner-a"], reason: string | null = "Selección manual") {
  const data = new FormData();
  tokens.forEach((token) => data.append("winnerToken", token));
  if (reason !== null) data.set("reason", reason);
  return data;
}

function responses(tokens: string[], total = tokens.length) {
  return {
    total_items: total,
    page_count: Math.max(1, Math.ceil(total / 100)),
    items: tokens.map((token) => ({ token, response_id: `response-${token}` })),
  };
}

async function expectRejected(
  data = submission(),
  winnerError: "forbidden" | "reason" | "invalid-response" = "forbidden",
) {
  await expect(selectWinnersAction(WORKSPACE.id, FORM.id, data)).rejects.toMatchObject({
    message: "NEXT_REDIRECT",
    path: `${PATH}?winnerError=${winnerError}`,
  });
}

function expectNoOutsideWrites() {
  expect(mocks.outsideFormUpsert).not.toHaveBeenCalled();
  expect(mocks.outsideDelete).not.toHaveBeenCalled();
  expect(mocks.outsideWinnerUpsert).not.toHaveBeenCalled();
}

function expectNoSuccessEffects() {
  expect(mocks.cookies).not.toHaveBeenCalled();
  expect(mocks.setCookie).not.toHaveBeenCalled();
  expect(mocks.createAuditLog).not.toHaveBeenCalled();
  expect(mocks.revalidatePath).not.toHaveBeenCalled();
}

function expectNoWrites() {
  expectNoOutsideWrites();
  expect(mocks.transaction).not.toHaveBeenCalled();
  expect(mocks.txFormUpsert).not.toHaveBeenCalled();
  expect(mocks.txDelete).not.toHaveBeenCalled();
  expect(mocks.txWinnerUpsert).not.toHaveBeenCalled();
  expectNoSuccessEffects();
}

describe("selectWinnersAction", () => {
  let committedTokens: string[];
  let stagedTokens: string[];

  beforeEach(() => {
    vi.resetAllMocks();
    committedTokens = ["previous-winner"];
    stagedTokens = [];
    mocks.redirect.mockImplementation((path: string): never => {
      throw Object.assign(new Error("NEXT_REDIRECT"), { path });
    });
    mocks.getWorkspaceAccessContext.mockResolvedValue({ user: USER, workspace: WORKSPACE });
    mocks.membership.mockResolvedValue({ role: "EDITOR" });
    mocks.workspace.mockResolvedValue({ ...WORKSPACE, createdFromApp: true });
    mocks.txWorkspace.mockResolvedValue({ ...WORKSPACE, createdFromApp: true });
    mocks.txMembership.mockResolvedValue({ role: "EDITOR" });
    mocks.txUser.mockResolvedValue({ ...USER, name: "Editor", status: "ACTIVE" });
    mocks.txSession.mockResolvedValue({ id: "session", userId: USER.id, expiresAt: new Date(Date.now() + 600_000) });
    mocks.txAllowed.mockResolvedValue({ id: "allowed" });
    mocks.txQueryRaw.mockResolvedValue([]);
    mocks.txForm.mockResolvedValue({ typeformId: FORM.id, workspaceId: WORKSPACE.id });
    mocks.localForm.mockResolvedValue({ id: "local-form", workspaceId: WORKSPACE.id });
    mocks.getTypeformForm.mockResolvedValue(FORM);
    mocks.resolveWorkspaceTypeformId.mockResolvedValue("canonical-workspace");
    mocks.formBelongsToWorkspace.mockImplementation(
      (form, workspaceId) => form.workspace?.href === `https://api.typeform.com/workspaces/${workspaceId}`,
    );
    mocks.getTypeformFormResponses.mockResolvedValue(responses(["winner-a"]));
    mocks.getTypeformResponseParticipantEmail.mockReturnValue("winner@example.test");
    mocks.txFormUpsert.mockResolvedValue({ id: "local-form" });
    mocks.txDelete.mockImplementation(async ({ where }) => {
      const previousCount = stagedTokens.length;
      stagedTokens = stagedTokens.filter((token) => where.responseToken?.notIn.includes(token));
      return { count: previousCount - stagedTokens.length };
    });
    mocks.txWinnerUpsert.mockImplementation(async ({ create }) => {
      if (!stagedTokens.includes(create.responseToken)) stagedTokens.push(create.responseToken);
      return create;
    });
    // Logical transaction double only: commit the staged array if the callback
    // resolves. This verifies callback boundaries, not real database rollback.
    mocks.transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<void>) => {
      stagedTokens = [...committedTokens];
      await callback(tx);
      committedTokens = [...stagedTokens];
    });
    mocks.cookies.mockResolvedValue({ set: mocks.setCookie });
    mocks.createAuditLog.mockResolvedValue(undefined);
    mocks.revealActor.mockResolvedValue({ user: USER, session: { id: "session", userId: USER.id, expiresAt: new Date(Date.now() + 600_000) } });
    mocks.issueGrant.mockResolvedValue({ flowToken: "opaque-flow", expiresAt: new Date(Date.now() + 120_000).toISOString() });
  });

  it("la confirmación nueva devuelve un permiso opaco, sin datos ni cookie, solo después de guardar", async () => {
    const result = await confirmWinnersForRevealAction(WORKSPACE.id, FORM.id, submission());
    expect(result).toMatchObject({ status: "confirmed", winnerCount: 1, grant: { flowToken: "opaque-flow" } });
    expect(JSON.stringify(result)).not.toContain("winner@example.test");
    expect(mocks.revealActor).toHaveBeenCalledTimes(3);
    expect(mocks.revokeGrants).toHaveBeenCalledWith(tx, WORKSPACE.id, FORM.id, "local-form");
    expect(mocks.issueGrant).toHaveBeenCalledWith(tx, expect.anything(), WORKSPACE.id, FORM.id, "local-form", ["winner-a"]);
    expect(mocks.revokeGrants.mock.invocationCallOrder[0]).toBeLessThan(mocks.txDelete.mock.invocationCallOrder[0]);
    expect(mocks.txWinnerUpsert.mock.invocationCallOrder[0]).toBeLessThan(mocks.issueGrant.mock.invocationCallOrder[0]);
    expect(mocks.setCookie).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("retirar todos los ganadores revoca el flujo sin emitir otro permiso", async () => {
    expect(await confirmWinnersForRevealAction(WORKSPACE.id, FORM.id, submission([], "Retirar selección"))).toEqual({ status: "confirmed", winnerCount: 0, grant: null });
    expect(mocks.revokeGrants).toHaveBeenCalledOnce();
    expect(mocks.issueGrant).not.toHaveBeenCalled();
  });

  it("un fallo al crear el permiso no confirma parcialmente la selección", async () => {
    mocks.issueGrant.mockRejectedValueOnce(new Error("Permiso no disponible"));
    await expect(confirmWinnersForRevealAction(WORKSPACE.id, FORM.id, submission())).rejects.toThrow("Permiso no disponible");
    expect(committedTokens).toEqual(["previous-winner"]);
    expectNoSuccessEffects();
  });

  it("rejects a foreign local form before remote requests or writes", async () => {
    mocks.localForm.mockResolvedValue({ id: "foreign-form", workspaceId: "other-workspace" });
    await expectRejected();
    expect(mocks.getTypeformForm).not.toHaveBeenCalled();
    expect(mocks.getTypeformFormResponses).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it.each([true, false])("rejects foreign remote ownership with local form present=%s", async (hasLocal) => {
    if (!hasLocal) mocks.localForm.mockResolvedValue(null);
    mocks.getTypeformForm.mockResolvedValue({
      ...FORM,
      workspace: { href: "https://api.typeform.com/workspaces/foreign" },
    });
    await expectRejected();
    expect(mocks.resolveWorkspaceTypeformId).toHaveBeenCalledWith(WORKSPACE.typeformId);
    expect(mocks.formBelongsToWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ id: FORM.id }), "canonical-workspace",
    );
    expect(mocks.getTypeformFormResponses).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it("rejects a mismatching canonical form ID", async () => {
    mocks.getTypeformForm.mockResolvedValue({ ...FORM, id: "another-form" });
    await expectRejected();
    expectNoWrites();
  });

  it.each([true, false])("rejects unknown tokens without changing previous winners (local=%s)", async (hasLocal) => {
    if (!hasLocal) mocks.localForm.mockResolvedValue(null);
    await expectRejected(submission(["winner-a", "unknown-token"]), "invalid-response");
    expect(mocks.getTypeformFormResponses).toHaveBeenCalledTimes(2);
    expect(committedTokens).toEqual(["previous-winner"]);
    expectNoWrites();
  });

  it.each([null, "", " \n\t "])("requires a trimmed nonempty reason: %j", async (reason) => {
    await expectRejected(submission(["winner-a"], reason), "reason");
    expect(mocks.getTypeformForm).not.toHaveBeenCalled();
    expect(mocks.getTypeformFormResponses).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it("requires a reason even when clearing winners", async () => {
    await expectRejected(submission([], " \t "), "reason");
    expectNoWrites();
  });

  it("preserves the DB membership role precedence and rejects viewers", async () => {
    mocks.membership.mockResolvedValue({ role: "VIEWER" });
    await expectRejected();
    expect(mocks.localForm).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it("retains SUPER_ADMIN permission even with VIEWER membership", async () => {
    mocks.getWorkspaceAccessContext.mockResolvedValue({
      user: { ...USER, globalRole: "SUPER_ADMIN" }, workspace: WORKSPACE,
    });
    mocks.membership.mockResolvedValue({ role: "VIEWER" });
    mocks.revealActor.mockResolvedValue({ user: { ...USER, globalRole: "SUPER_ADMIN" }, session: { id: "session", userId: USER.id, expiresAt: new Date(Date.now() + 600_000) } });
    mocks.txUser.mockResolvedValue({ ...USER, name: "Admin", status: "ACTIVE", globalRole: "SUPER_ADMIN" });
    mocks.txMembership.mockResolvedValue({ role: "VIEWER" });
    await expect(selectWinnersAction(WORKSPACE.id, FORM.id, submission())).rejects.toMatchObject({
      path: `${PATH}?page=1&pageSize=20&winnerSelection=1`,
    });
    expect(mocks.transaction).toHaveBeenCalledOnce();
  });

  it("rejects a missing DB membership even with a cached EDITOR context", async () => {
    mocks.membership.mockResolvedValue(null);
    await expectRejected();
    expectNoWrites();
  });

  it.each([
    "Selección manual de ganadores",
    "Selección aleatoria de ganadores - Norte",
  ])("saves normalized unique tokens, reason label %s, audit, cookie and redirect", async (reason) => {
    const data = submission([" winner-a ", "winner-a", "", " \t "], ` ${reason} `);
    data.set("page", "3");
    data.set("pageSize", "all");
    data.set("winnerRegionFilter", " Norte ");
    await expect(selectWinnersAction(WORKSPACE.id, FORM.id, data)).rejects.toMatchObject({
      path: `${PATH}?page=3&pageSize=all&winnerSelection=1&winnerRegionFilter=Norte`,
    });
    expect(mocks.getTypeformForm).toHaveBeenCalledWith(FORM.id);
    expect(mocks.formBelongsToWorkspace).toHaveBeenCalledWith(FORM, "canonical-workspace");
    expect(mocks.getTypeformFormResponses).toHaveBeenCalledExactlyOnceWith(FORM.id, {
      pageSize: 1, includedResponseIds: ["winner-a"],
    });
    expect(mocks.transaction).toHaveBeenCalledExactlyOnceWith(expect.any(Function), { isolationLevel: "ReadCommitted" });
    expect(mocks.txDelete).toHaveBeenCalledExactlyOnceWith({
      where: { formId: "local-form", workspaceId: WORKSPACE.id, responseToken: { notIn: ["winner-a"] } },
    });
    expect(mocks.txWinnerUpsert).toHaveBeenCalledExactlyOnceWith({
      where: { formId_responseToken: { formId: "local-form", responseToken: "winner-a" }, workspaceId: WORKSPACE.id },
      update: { participantEmail: "winner@example.test", reason, selectedByUserId: USER.id, selectedAt: expect.any(Date) },
      create: {
        formId: "local-form", workspaceId: WORKSPACE.id, responseToken: "winner-a",
        participantEmail: "winner@example.test", reason, selectedByUserId: USER.id, selectedAt: expect.any(Date),
      },
    });
    expect(committedTokens).toEqual(["winner-a"]);
    expect(mocks.setCookie).toHaveBeenCalledExactlyOnceWith(
      `winner_selection:${WORKSPACE.id}:${FORM.id}`, expect.any(String),
      { httpOnly: true, sameSite: "lax", secure: false, path: PATH, maxAge: 120 },
    );
    expect(JSON.parse(mocks.setCookie.mock.calls[0][1])).toEqual({
      tokens: ["winner-a"], reason, by: USER.id, at: expect.any(String),
    });
    expect(mocks.createAuditLog).toHaveBeenCalledExactlyOnceWith({
      action: "WINNER_SELECTED", actor: USER, target: { type: "form_winners", id: FORM.id },
      context: {
        workspaceId: WORKSPACE.id, workspaceName: WORKSPACE.name, formId: FORM.id,
        metadata: { winnerCount: 1, winnerTokens: "winner-a", reason },
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledExactlyOnceWith(PATH);
    expect(mocks.txWinnerUpsert.mock.invocationCallOrder[0]).toBeLessThan(mocks.cookies.mock.invocationCallOrder[0]);
    expect(mocks.revalidatePath.mock.invocationCallOrder[0]).toBeLessThan(mocks.redirect.mock.invocationCallOrder[0]);
    expectNoOutsideWrites();
  });

  it("creates a missing local form only inside the validated transaction, without reassigning ownership", async () => {
    mocks.localForm.mockResolvedValue(null);
    await expect(selectWinnersAction(WORKSPACE.id, FORM.id, submission())).rejects.toMatchObject({ message: "NEXT_REDIRECT" });
    expect(mocks.txFormUpsert).toHaveBeenCalledExactlyOnceWith({
      where: { typeformId: FORM.id, workspaceId: WORKSPACE.id },
      create: { title: FORM.title, description: null, typeformId: FORM.id, selfUrl: FORM.self.href, workspaceId: WORKSPACE.id },
      update: {},
      select: { id: true },
    });
    expect(mocks.getTypeformFormResponses.mock.invocationCallOrder[0]).toBeLessThan(mocks.transaction.mock.invocationCallOrder[0]);
    expectNoOutsideWrites();
  });

  it("clears winners atomically without fetching responses and preserves clear audit/cookie semantics", async () => {
    const reason = "Ganadores removidos manualmente";
    await expect(selectWinnersAction(WORKSPACE.id, FORM.id, submission([], reason))).rejects.toMatchObject({
      path: `${PATH}?page=1&pageSize=20&winnerSelection=1`,
    });
    expect(mocks.getTypeformForm).toHaveBeenCalledWith(FORM.id);
    expect(mocks.formBelongsToWorkspace).toHaveBeenCalledWith(FORM, "canonical-workspace");
    expect(mocks.getTypeformFormResponses).not.toHaveBeenCalled();
    expect(mocks.txDelete).toHaveBeenCalledExactlyOnceWith({ where: { formId: "local-form", workspaceId: WORKSPACE.id } });
    expect(mocks.txWinnerUpsert).not.toHaveBeenCalled();
    expect(committedTokens).toEqual([]);
    expect(mocks.setCookie).toHaveBeenCalledExactlyOnceWith(
      `winner_selection:${WORKSPACE.id}:${FORM.id}`, "",
      { httpOnly: true, sameSite: "lax", secure: false, path: PATH, maxAge: 0 },
    );
    expect(mocks.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: "WINNER_SELECTED",
      context: expect.objectContaining({ metadata: { winnerCount: 0, winnerTokens: "", reason } }),
    }));
    expect(mocks.revalidatePath).toHaveBeenCalledWith(PATH);
    expectNoOutsideWrites();
  });

  it("rejects foreign remote ownership when clearing, too", async () => {
    mocks.formBelongsToWorkspace.mockReturnValue(false);
    await expectRejected(submission([], "Ganadores removidos manualmente"));
    expect(mocks.getTypeformFormResponses).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it("uses canonical workspace DB IDs for all writes even when called with an alias", async () => {
    await expect(selectWinnersAction(WORKSPACE.typeformId, FORM.id, submission())).rejects.toMatchObject({ message: "NEXT_REDIRECT" });
    expect(mocks.membership).toHaveBeenCalledWith({
      where: { userId_workspaceId: { userId: USER.id, workspaceId: WORKSPACE.id } }, select: { role: true },
    });
    expect(mocks.txDelete.mock.calls[0][0].where.workspaceId).toBe(WORKSPACE.id);
    expect(mocks.txWinnerUpsert.mock.calls[0][0].where.workspaceId).toBe(WORKSPACE.id);
    expect(mocks.txWinnerUpsert.mock.calls[0][0].create.workspaceId).toBe(WORKSPACE.id);
  });

  it("batches direct lookups instead of sending unbounded includedResponseIds", async () => {
    const tokens = Array.from({ length: 205 }, (_, index) => `token-${index}`);
    mocks.getTypeformFormResponses.mockImplementation(async (_id, options) => responses(options.includedResponseIds));
    await expect(selectWinnersAction(WORKSPACE.id, FORM.id, submission(tokens))).rejects.toMatchObject({ message: "NEXT_REDIRECT" });
    expect(mocks.getTypeformFormResponses.mock.calls.map(([, options]) => options.pageSize)).toEqual([100, 100, 5]);
    expect(mocks.getTypeformFormResponses.mock.calls.flatMap(([, options]) => options.includedResponseIds)).toEqual(tokens);
    expect(mocks.txWinnerUpsert).toHaveBeenCalledTimes(205);
  });

  it("falls back across cursor pages when response IDs differ from tokens", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => `unselected-${index}`);
    mocks.getTypeformFormResponses
      .mockResolvedValueOnce(responses([]))
      .mockResolvedValueOnce(responses(firstPage, 101))
      .mockResolvedValueOnce(responses(["winner-a"], 101));
    await expect(selectWinnersAction(WORKSPACE.id, FORM.id, submission())).rejects.toMatchObject({ message: "NEXT_REDIRECT" });
    expect(mocks.getTypeformFormResponses).toHaveBeenNthCalledWith(3, FORM.id, { pageSize: 100, before: "unselected-99" });
    expect(mocks.txWinnerUpsert).toHaveBeenCalledOnce();
  });

  it("does not mistake response_id equality for token membership", async () => {
    mocks.getTypeformFormResponses.mockResolvedValue({
      total_items: 1, page_count: 1, items: [{ token: "another-token", response_id: "winner-a" }],
    });
    await expectRejected(submission(), "invalid-response");
    expectNoWrites();
  });

  it("validates all lookup batches before any write, including a missing token in the last batch", async () => {
    const tokens = Array.from({ length: 101 }, (_, index) => `token-${index}`);
    mocks.getTypeformFormResponses
      .mockResolvedValueOnce(responses(tokens.slice(0, 100)))
      .mockResolvedValueOnce(responses([]))
      .mockResolvedValueOnce(responses(tokens.slice(0, 100)))
      .mockResolvedValueOnce(responses([]));
    await expectRejected(submission(tokens), "invalid-response");
    expect(mocks.getTypeformFormResponses).toHaveBeenCalledTimes(3);
    expectNoWrites();
  });

  it("stops on repeated pagination cursors and rejects unresolved tokens without writes", async () => {
    const page = Array.from({ length: 100 }, (_, index) => `other-${index}`);
    mocks.getTypeformFormResponses
      .mockResolvedValueOnce(responses([]))
      .mockResolvedValue(responses(page, 1000));
    await expectRejected(submission(), "invalid-response");
    expect(mocks.getTypeformFormResponses).toHaveBeenCalledTimes(3);
    expectNoWrites();
  });

  it("does not log provider errors containing PII and can recover using pagination", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      mocks.getTypeformFormResponses
        .mockRejectedValueOnce(new Error("provider included email private@example.test"))
        .mockResolvedValueOnce(responses(["winner-a"]));
      await expect(selectWinnersAction(WORKSPACE.id, FORM.id, submission())).rejects.toMatchObject({ message: "NEXT_REDIRECT" });
      expect(log).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
      warn.mockRestore();
    }
  });

  it("does not write on a failed fallback lookup", async () => {
    mocks.getTypeformFormResponses.mockRejectedValue(new Error("provider unavailable"));
    await expect(selectWinnersAction(WORKSPACE.id, FORM.id, submission())).rejects.toThrow("provider unavailable");
    expectNoWrites();
  });

  it("does not write if remote form ownership cannot be checked", async () => {
    mocks.getTypeformForm.mockRejectedValue(new Error("provider unavailable"));
    await expect(selectWinnersAction(WORKSPACE.id, FORM.id, submission())).rejects.toThrow("provider unavailable");
    expectNoWrites();
  });

  it("allows a validated response without an email, but never an unknown response", async () => {
    mocks.getTypeformResponseParticipantEmail.mockReturnValue(null);
    await expect(selectWinnersAction(WORKSPACE.id, FORM.id, submission())).rejects.toMatchObject({ message: "NEXT_REDIRECT" });
    expect(mocks.txWinnerUpsert.mock.calls[0][0].create.participantEmail).toBeNull();
  });

  it("keeps delete and all upserts in one callback; a later failure does not commit staged changes", async () => {
    mocks.getTypeformFormResponses.mockResolvedValue(responses(["winner-a", "winner-b"]));
    mocks.txWinnerUpsert.mockImplementationOnce(async ({ create }) => {
      stagedTokens.push(create.responseToken);
      return create;
    }).mockRejectedValueOnce(new Error("write failed"));
    await expect(selectWinnersAction(WORKSPACE.id, FORM.id, submission(["winner-a", "winner-b"]))).rejects.toThrow("write failed");
    expect(mocks.transaction).toHaveBeenCalledExactlyOnceWith(expect.any(Function), { isolationLevel: "ReadCommitted" });
    expect(mocks.txDelete).toHaveBeenCalledOnce();
    expect(mocks.txWinnerUpsert).toHaveBeenCalledTimes(2);
    expect(stagedTokens).toEqual(["winner-a"]);
    expect(committedTokens).toEqual(["previous-winner"]);
    expectNoOutsideWrites();
    expectNoSuccessEffects();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("does not delete winners if the workspace-scoped form upsert fails", async () => {
    mocks.txFormUpsert.mockRejectedValue(new Error("unique constraint: foreign form"));
    await expect(selectWinnersAction(WORKSPACE.id, FORM.id, submission())).rejects.toThrow("unique constraint");
    expect(mocks.txDelete).not.toHaveBeenCalled();
    expect(mocks.txWinnerUpsert).not.toHaveBeenCalled();
    expect(committedTokens).toEqual(["previous-winner"]);
    expectNoOutsideWrites();
    expectNoSuccessEffects();
  });
});