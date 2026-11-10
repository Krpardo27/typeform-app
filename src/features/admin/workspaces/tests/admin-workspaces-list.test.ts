import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = {
  id: string; name: string; typeformId: string; createdFromApp: boolean;
  templateFormTypeformId: string | null; _count: { users: number };
};
type Where = { createdFromApp: boolean; typeformId: { in: string[] } };
const mocks = vi.hoisted(() => ({
  catalog: vi.fn(), transaction: vi.fn(), count: vi.fn(), findMany: vi.fn(),
  deleteMany: vi.fn(), update: vi.fn(), create: vi.fn(), rows: [] as Row[],
}));
vi.mock("@/features/typeform/services/typeform.service", () => ({ getAllTypeformWorkspaces: mocks.catalog }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));

import { getAdminWorkspacesPage } from "../services/admin-workspaces-list.service";
import { filterAvailableWorkspaces } from "../services/workspace-availability";

function row(index: number, createdFromApp = true): Row {
  return {
    id: `local-${index}`, name: `Radio ${index}`, typeformId: `remote-${index}`,
    createdFromApp, templateFormTypeformId: null, _count: { users: index },
  };
}
function matching(where: Where) {
  return mocks.rows.filter((item) => item.createdFromApp === where.createdFromApp && where.typeformId.in.includes(item.typeformId));
}
function noWrites() {
  expect(mocks.deleteMany).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.create).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.rows = Array.from({ length: 14 }, (_, index) => row(index));
  mocks.catalog.mockResolvedValue(mocks.rows.slice(0, 13).map((item) => ({ id: item.typeformId, name: item.name })));
  mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback({
    workspace: { count: mocks.count, findMany: mocks.findMany, deleteMany: mocks.deleteMany, update: mocks.update, create: mocks.create },
  }));
  mocks.count.mockImplementation(async ({ where }: { where: Where }) => matching(where).length);
  mocks.findMany.mockImplementation(async ({ where, skip, take }: { where: Where; skip: number; take: number }) => matching(where).slice(skip, skip + take));
});

describe("listado administrativo sincronizado con Typeform", () => {
  it("filtra antes de contar y paginar, con filas y total en la misma instantánea", async () => {
    const result = await getAdminWorkspacesPage(2, 12);
    expect(result).toMatchObject({ totalItems: 13, totalPages: 2, currentPage: 2, itemsPerPage: 12 });
    expect(result.items.map((item) => item.id)).toEqual(["local-12"]);
    const where = { createdFromApp: true, typeformId: { in: mocks.rows.slice(0, 13).map((item) => item.typeformId) } };
    expect(mocks.count).toHaveBeenCalledExactlyOnceWith({ where });
    expect(mocks.findMany).toHaveBeenCalledExactlyOnceWith({
      where,
      select: { id: true, name: true, typeformId: true, templateFormTypeformId: true, _count: { select: { users: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: 12, take: 12,
    });
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" });
    expect(mocks.catalog).toHaveBeenCalledOnce();
    noWrites();
  });

  it("si se elimina el último workspace de la última página corrige la página y el contador", async () => {
    expect((await getAdminWorkspacesPage(2, 12)).items).toHaveLength(1);
    mocks.catalog.mockResolvedValueOnce(mocks.rows.slice(0, 12).map((item) => ({ id: item.typeformId })));
    const result = await getAdminWorkspacesPage(2, 12);
    expect(result).toMatchObject({ currentPage: 1, totalPages: 1, totalItems: 12 });
    expect(result.items).toHaveLength(12);
    expect(result.items.some((item) => item.id === "local-12")).toBe(false);
    expect(mocks.rows).toHaveLength(14);
    noWrites();
  });

  it("no incorpora workspaces remotos ajenos a la app ni modifica createdFromApp", async () => {
    mocks.rows = [row(1), row(2, false)];
    mocks.catalog.mockResolvedValueOnce([{ id: "remote-1" }, { id: "remote-2" }, { id: "remote-no-local" }]);
    const result = await getAdminWorkspacesPage(1, 12);
    expect(result.totalItems).toBe(1);
    expect(result.items.map((item) => item.id)).toEqual(["local-1"]);
    expect(mocks.rows[1].createdFromApp).toBe(false);
    noWrites();
  });

  it("un workspace recreado con el mismo nombre pero otro ID no sustituye al eliminado", async () => {
    mocks.rows = [row(1)];
    mocks.catalog.mockResolvedValueOnce([{ id: "remote-new", name: "Radio 1" }]);
    const result = await getAdminWorkspacesPage(1, 12);
    expect(result.totalItems).toBe(0);
    expect(result.items).toEqual([]);
    expect(mocks.findMany).not.toHaveBeenCalled();
    noWrites();
  });

  it("un catálogo vacío válido muestra cero sin borrar los registros locales", async () => {
    mocks.catalog.mockResolvedValueOnce([]);
    expect(await getAdminWorkspacesPage(999, 24)).toEqual({ items: [], totalItems: 0, totalPages: 1, currentPage: 1, itemsPerPage: 24 });
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.rows).toHaveLength(14);
    noWrites();
  });

  it.each(["401", "403", "429", "503", "Catálogo incompleto", "Sin conexión"])("propaga %s en vez de mostrar un catálogo vacío o borrar datos", async (message) => {
    const error = new Error(message);
    mocks.catalog.mockRejectedValueOnce(error);
    await expect(getAdminWorkspacesPage(1, 12)).rejects.toBe(error);
    expect(mocks.transaction).not.toHaveBeenCalled();
    noWrites();
  });

  it.each(["count", "findMany"] as const)("propaga fallos de %s sin ocultarlos como cero workspaces", async (stage) => {
    const error = new Error("BD no disponible");
    mocks[stage].mockRejectedValueOnce(error);
    await expect(getAdminWorkspacesPage(1, 12)).rejects.toBe(error);
    noWrites();
  });

  it.each([0, -1, 1.5, NaN, Infinity])("normaliza la página inválida %s", async (page) => {
    expect(await getAdminWorkspacesPage(page, 12)).toMatchObject({ currentPage: 1 });
  });

  it.each([0, 10, 20, -1, NaN])("normaliza el tamaño no soportado %s", async (size) => {
    expect(await getAdminWorkspacesPage(1, size)).toMatchObject({ itemsPerPage: 12 });
  });

  it("el filtro compartido conserva los objetos y roles de los workspaces disponibles", async () => {
    const live = { typeformId: "remote-1", role: "VIEWER", extra: "preservado" };
    const deleted = { typeformId: "remote-old", role: "EDITOR", extra: "histórico" };
    const result = await filterAvailableWorkspaces([live, deleted]);
    expect(result).toEqual([live]);
    expect(result[0]).toBe(live);
    expect(live.role).toBe("VIEWER");
    noWrites();
  });

  it("no consulta Typeform si no hay workspaces locales que filtrar", async () => {
    expect(await filterAvailableWorkspaces([])).toEqual([]);
    expect(mocks.catalog).not.toHaveBeenCalled();
  });
});