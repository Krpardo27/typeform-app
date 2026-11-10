import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ catalog: vi.fn(), workspaces: vi.fn(), workspace: vi.fn(), memberships: vi.fn(), membership: vi.fn() }));
vi.mock("@/features/typeform/services/typeform.service", () => ({ getAllTypeformWorkspaces: mocks.catalog }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  workspace: { findMany: mocks.workspaces, findFirst: mocks.workspace },
  userWorkspace: { findMany: mocks.memberships, findFirst: mocks.membership },
} }));

import { getAuthorizedWorkspace, getVisibleWorkspaces } from "../services/workspace-permissions";

const admin = { id: "admin", globalRole: "SUPER_ADMIN" };
const user = { id: "user", globalRole: "USER" };
const live = { id: "local", name: "Radio", typeformId: "remote-live", templateFormTypeformId: null };
const deleted = { ...live, id: "old-local", typeformId: "remote-deleted" };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.catalog.mockResolvedValue([{ id: "remote-live" }]);
  mocks.workspaces.mockResolvedValue([live, deleted]);
  mocks.memberships.mockResolvedValue([{ workspace: live, role: "VIEWER" }, { workspace: deleted, role: "EDITOR" }]);
  mocks.workspace.mockResolvedValue(live);
  mocks.membership.mockResolvedValue({ workspace: live, role: "VIEWER" });
});

describe("disponibilidad de workspaces en navegación y acceso", () => {
  it("el catálogo administrativo excluye los eliminados sin incluir workspaces no locales", async () => {
    expect(await getVisibleWorkspaces(admin)).toEqual([{ ...live, role: "EDITOR" }]);
    expect(mocks.workspaces.mock.calls[0][0].where).toEqual({ createdFromApp: true });
  });

  it("el catálogo de usuario conserva solo sus asignaciones disponibles y sus roles", async () => {
    expect(await getVisibleWorkspaces(user)).toEqual([{ ...live, role: "VIEWER" }]);
    expect(mocks.memberships.mock.calls[0][0].where).toEqual({ userId: user.id, workspace: { createdFromApp: true } });
  });

  it.each([admin, user])("no autoriza una ruta directa a un workspace remoto retirado: $globalRole", async (actor) => {
    mocks.workspace.mockResolvedValueOnce(deleted);
    mocks.membership.mockResolvedValueOnce({ workspace: deleted, role: "EDITOR" });
    expect(await getAuthorizedWorkspace(actor, deleted.id)).toBeNull();
  });

  it.each([admin, user])("preserva el acceso local existente a un workspace disponible: $globalRole", async (actor) => {
    expect(await getAuthorizedWorkspace(actor, live.id)).toEqual({ ...live, role: actor.globalRole === "SUPER_ADMIN" ? "EDITOR" : "VIEWER" });
  });

  it.each([admin, user])("comprueba autorización local antes de consultar el catálogo remoto: $globalRole", async (actor) => {
    mocks.workspace.mockResolvedValueOnce(null);
    mocks.membership.mockResolvedValueOnce(null);
    expect(await getAuthorizedWorkspace(actor, "no-autorizado")).toBeNull();
    expect(mocks.catalog).not.toHaveBeenCalled();
  });

  it("sin asignaciones locales no consulta Typeform", async () => {
    mocks.memberships.mockResolvedValueOnce([]);
    expect(await getVisibleWorkspaces(user)).toEqual([]);
    expect(mocks.catalog).not.toHaveBeenCalled();
  });

  it("un fallo de Typeform no se presenta como catálogo vacío ni acceso inexistente", async () => {
    const error = new Error("Typeform API error 429");
    mocks.catalog.mockRejectedValue(error);
    await expect(getVisibleWorkspaces(user)).rejects.toBe(error);
    await expect(getAuthorizedWorkspace(user, live.id)).rejects.toBe(error);
  });
});