import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: vi.fn(), allowed: vi.fn(), workspaces: vi.fn(), workspace: vi.fn(), catalog: vi.fn(), forms: vi.fn(),
}));
vi.mock("@/lib/getCurrentUser", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  workspace: { findMany: mocks.workspaces, findFirst: mocks.workspace },
  allowedUser: { findFirst: mocks.allowed, findMany: vi.fn(async () => []) },
} }));
vi.mock("@/features/typeform/services/typeform.service", () => ({
  getAllTypeformWorkspaces: mocks.catalog, getWorkspaceForms: mocks.forms,
}));

import { searchGlobalAction } from "./search-action";

const workspace = { id: "local", typeformId: "remote", name: "Radio" };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: "admin", globalRole: "SUPER_ADMIN" });
  mocks.workspaces.mockResolvedValue([workspace]);
  mocks.workspace.mockResolvedValue(workspace);
  mocks.catalog.mockResolvedValue([{ id: "remote" }]);
  mocks.forms.mockResolvedValue({ page_count: 1, items: [] });
});

describe("trabajo por petición de búsqueda", () => {
  const search = () => searchGlobalAction("radio", { includeForms: true, workspaceId: "local" });

  it("comparte catálogo entre navegación y formularios sin reutilizarlo en la próxima petición", async () => {
    await search();
    expect(mocks.catalog).toHaveBeenCalledOnce();
    await search();
    expect(mocks.catalog).toHaveBeenCalledTimes(2);
  });

  it("no carga catálogo remoto si no hay autorización local", async () => {
    mocks.workspaces.mockResolvedValue([]);
    mocks.workspace.mockResolvedValue(null);
    await search();
    expect(mocks.catalog).not.toHaveBeenCalled();
    expect(mocks.forms).not.toHaveBeenCalled();
  });

  it("no convierte errores de catálogo en vacío ni conserva el rechazo en la próxima petición", async () => {
    mocks.catalog.mockRejectedValueOnce(new Error("remote unavailable"));
    await expect(search()).rejects.toThrow("remote unavailable");
    await expect(search()).resolves.toHaveProperty("workspaces");
    expect(mocks.catalog).toHaveBeenCalledTimes(2);
  });

  it("recorre todas las páginas en orden con un máximo de cuatro GET simultáneos", async () => {
    let active = 0;
    let maximum = 0;
    mocks.forms.mockImplementation(async (_id: string, { page }: { page: number }) => {
      active++;
      maximum = Math.max(maximum, active);
      await Promise.resolve();
      active--;
      return { page_count: 9, items: [{ id: `form-${page}`, title: `Radio ${page}` }] };
    });
    const result = await search();
    expect(mocks.forms).toHaveBeenCalledTimes(9);
    expect(maximum).toBe(4);
    expect(result.forms.map((form) => form.id)).toEqual(Array.from({ length: 9 }, (_, index) => `form-${index + 1}`));
  });

  it("rechaza al usuario fuera de whitelist antes de consultar navegación/Typeform", async () => {
    mocks.user.mockResolvedValue({ id: "user", email: "user@example.invalid", globalRole: "USER" });
    mocks.allowed.mockResolvedValue(null);
    await expect(search()).rejects.toThrow();
    expect(mocks.workspaces).not.toHaveBeenCalled();
    expect(mocks.catalog).not.toHaveBeenCalled();
  });
});