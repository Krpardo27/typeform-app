import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  access: vi.fn(), actor: vi.fn(), transaction: vi.fn(), query: vi.fn(), write: vi.fn(),
  audit: vi.fn(), issue: vi.fn(), revoke: vi.fn(), grant: vi.fn(), finish: vi.fn(),
  form: vi.fn(), responses: vi.fn(), cookies: vi.fn(), revalidate: vi.fn(),
  redirect: vi.fn((path: string): never => { throw Object.assign(new Error("NEXT_REDIRECT"), { path }); }),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, unstable_rethrow: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/features/admin/workspaces/services/workspace-access", () => ({ getWorkspaceAccessContext: mocks.access }));
vi.mock("@/features/admin/audit/services/audit-log.service", () => ({ createAuditLog: mocks.audit }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  $transaction: mocks.transaction,
  workspace: { findFirst: mocks.query, findUnique: mocks.query },
  userWorkspace: { findUnique: mocks.query },
  form: { findUnique: mocks.query, upsert: mocks.write },
  formWinner: { findMany: mocks.query, upsert: mocks.write, deleteMany: mocks.write },
} }));
vi.mock("../../services/typeform.service", () => ({
  getTypeformForm: mocks.form, resolveWorkspaceTypeformId: mocks.form,
  formBelongsToWorkspace: mocks.form, getTypeformResponseParticipantEmail: mocks.form,
  mapMaskedTypeformResponses: mocks.form,
}));
vi.mock("../../services/load-winner-responses", () => ({ getWinnerResponsesByToken: mocks.responses }));
vi.mock("../../services/winner-reveal.service", () => ({
  getWinnerRevealActor: mocks.actor, issueWinnerRevealGrant: mocks.issue,
  revokeWinnerRevealGrants: mocks.revoke, requireWinnerRevealGrant: mocks.grant,
  finishWinnerReveal: mocks.finish,
  WinnerRevealDenied: class WinnerRevealDenied extends Error {},
}));

import { confirmWinnersForRevealAction, selectWinnersAction } from "../select-winners.action";
import { beginSavedWinnerDataAction, readParticipantDataAction, readWinnerDataAction } from "../winner-reveal.action";
import { FIXTURE_READ_ONLY_MESSAGE } from "../../services/typeform-fixture-mode";

function handcraftedSubmission() {
  const data = new FormData();
  data.append("winnerToken", "real-saved-winner");
  data.append("winnerToken", "fake-response");
  data.set("reason", "Intento directo fuera de la interfaz");
  data.set("isFixturePreview", "false");
  return data;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.redirect.mockImplementation((path: string): never => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { path });
  });
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("TYPEFORM_RESPONSES_SOURCE", "fixture");
  vi.stubEnv("TYPEFORM_FIXTURE_FORM_IDS", " preview, another-preview ");
});
afterEach(() => vi.unstubAllEnvs());

function expectNoSensitiveEffects() {
  for (const operation of [mocks.access, mocks.actor, mocks.transaction, mocks.query,
    mocks.write, mocks.audit, mocks.issue, mocks.revoke, mocks.grant, mocks.finish,
    mocks.form, mocks.responses, mocks.cookies, mocks.revalidate]) {
    expect(operation).not.toHaveBeenCalled();
  }
}

describe("acciones en preview fixture: denegación temprana del servidor", () => {
  it.each(["workspace", "workspace /?#"])("confirmación artesanal no autoriza, lee ni escribe (%s)", async (workspaceId) => {
    expect(await confirmWinnersForRevealAction(workspaceId, "preview", handcraftedSubmission())).toEqual({
      status: "denied", message: FIXTURE_READ_ONLY_MESSAGE,
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
    expectNoSensitiveEffects();
  });

  it("también bloquea la retirada artesanal de todos los ganadores", async () => {
    expect(await confirmWinnersForRevealAction("workspace", "preview", new FormData())).toEqual({
      status: "denied", message: FIXTURE_READ_ONLY_MESSAGE,
    });
    expectNoSensitiveEffects();
  });

  it("la acción legacy redirige al error fixture con IDs codificados, sin efectos", async () => {
    const workspaceId = "workspace /?#";
    await expect(selectWinnersAction(workspaceId, "preview", handcraftedSubmission())).rejects.toMatchObject({
      message: "NEXT_REDIRECT",
      path: `/workspaces/${encodeURIComponent(workspaceId)}/forms/preview/responses?winnerError=fixture`,
    });
    expect(mocks.redirect).toHaveBeenCalledOnce();
    expectNoSensitiveEffects();
  });

  it.each([
    ["begin guardados", () => beginSavedWinnerDataAction("workspace", "preview")],
    ["read ganador", () => readWinnerDataAction("workspace", "preview", "handcrafted-grant", "real-saved-winner")],
    ["wrapper read participante", () => readParticipantDataAction("workspace", "preview", "handcrafted-grant", "real-saved-winner")],
  ] as const)("%s no autentica, consulta grants ni audita", async (_name, invoke) => {
    expect(await invoke()).toEqual({ status: "denied", message: FIXTURE_READ_ONLY_MESSAGE });
    expectNoSensitiveEffects();
  });

  it.each(["other", "preview-extra"])("el alcance fixture no bloquea la autorización normal de %s", async (formId) => {
    const sentinel = new Error("auth sentinel");
    mocks.access.mockRejectedValueOnce(sentinel);
    await expect(confirmWinnersForRevealAction("workspace", formId, handcraftedSubmission())).rejects.toBe(sentinel);
    expect(mocks.access).toHaveBeenCalledExactlyOnceWith("workspace");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("en producción SOURCE fixture no sustituye la autorización por un preview", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const sentinel = new Error("auth sentinel");
    mocks.access.mockRejectedValueOnce(sentinel);
    await expect(confirmWinnersForRevealAction("workspace", "preview", handcraftedSubmission())).rejects.toBe(sentinel);
    expect(mocks.access).toHaveBeenCalledExactlyOnceWith("workspace");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it.each(["begin", "read", "wrapper"])("%s de otro formulario conserva su guard real", async (operation) => {
    const sentinel = new Error("guard sentinel");
    mocks.actor.mockRejectedValueOnce(sentinel);
    mocks.grant.mockRejectedValueOnce(sentinel);
    const result = operation === "begin"
      ? await beginSavedWinnerDataAction("workspace", "other")
      : await (operation === "read" ? readWinnerDataAction : readParticipantDataAction)("workspace", "other", "flow", "token");
    expect(result.status).toBe("denied");
    expect(result).not.toMatchObject({ message: FIXTURE_READ_ONLY_MESSAGE });
    if (operation === "begin") expect(mocks.actor).toHaveBeenCalledOnce();
    else expect(mocks.grant).toHaveBeenCalledExactlyOnceWith("flow", "workspace", "other");
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });
});