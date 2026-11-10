import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import type { TypeformFormSummary } from "@/features/typeform/services/typeform.service";
import type Pagination from "@/shared/components/Pagination";
import type { AdminWorkspacesGrid } from "../components/AdminWorkspacesGrid";

const mocks = vi.hoisted(() => ({
  workspaceFindFirst: vi.fn(),
  workspaceFindMany: vi.fn(),
  formFindMany: vi.fn(),
  resolveWorkspaceTypeformId: vi.fn(),
  getTypeformWorkspace: vi.fn(),
  getWorkspaceForms: vi.fn(),
  grid: vi.fn(),
  pagination: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: { findFirst: mocks.workspaceFindFirst, findMany: mocks.workspaceFindMany },
    form: { findMany: mocks.formFindMany },
  },
}));
vi.mock("@/features/typeform/services/typeform.service", () => ({
  resolveWorkspaceTypeformId: mocks.resolveWorkspaceTypeformId,
  getTypeformWorkspace: mocks.getTypeformWorkspace,
  getWorkspaceForms: mocks.getWorkspaceForms,
}));
vi.mock("../components/AdminWorkspacesGrid", () => ({ AdminWorkspacesGrid: mocks.grid }));
vi.mock("@/shared/components/Pagination", () => ({ default: mocks.pagination }));

import { AdminWorkspacesContent } from "../components/AdminWorkspacesContent";
import {
  getAdminWorkspace,
  getAdminWorkspaceDetail,
  getAdminWorkspaceFormsPage,
} from "../services/admin-workspace-detail.service";

const appWorkspace = {
  id: "workspace-local",
  name: "Workspace local",
  typeformId: "workspace-alias",
  templateFormTypeformId: null,
  _count: { users: 2, forms: 30 },
};
const typeformWorkspace = { id: "workspace-remoto", name: "Workspace remoto" };

function remotePage(page: number) {
  const length = page === 3 ? 6 : 12;
  const items: TypeformFormSummary[] = Array.from({ length }, (_, index) => ({
    id: `form-${(page - 1) * 12 + index + 1}`,
    title: `Formulario ${(page - 1) * 12 + index + 1}`,
  }));
  return { total_items: 30, page_count: 3, items };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.workspaceFindFirst.mockResolvedValue(appWorkspace);
  mocks.workspaceFindMany.mockResolvedValue([]);
  mocks.formFindMany.mockResolvedValue([]);
  mocks.resolveWorkspaceTypeformId.mockResolvedValue("workspace-resuelto");
  mocks.getTypeformWorkspace.mockResolvedValue(typeformWorkspace);
  mocks.getWorkspaceForms.mockImplementation(async (_id: string, { page }: { page: number }) => remotePage(page));
  mocks.grid.mockImplementation(() => createElement("div", null, "Grid simulado"));
  mocks.pagination.mockImplementation(() => createElement("nav", null, "Paginación simulada"));
});

describe("getAdminWorkspace", () => {
  it.each(["workspace-local", "workspace-alias"])("busca por ID local o remoto sin incluir workspaces ajenos a la app: %s", async (id) => {
    expect(await getAdminWorkspace(id)).toBe(appWorkspace);
    expect(mocks.workspaceFindFirst).toHaveBeenCalledExactlyOnceWith({
      where: { createdFromApp: true, OR: [{ id }, { typeformId: id }] },
      select: {
        id: true,
        name: true,
        typeformId: true,
        templateFormTypeformId: true,
        _count: { select: { users: true, forms: true } },
      },
    });
  });
});

describe("getAdminWorkspaceFormsPage", () => {
  it("reutiliza la primera página para conocer el límite sin repetir la consulta", async () => {
    const firstPage = remotePage(1);
    mocks.getWorkspaceForms.mockResolvedValue(firstPage);

    const result = await getAdminWorkspaceFormsPage("workspace-remoto", 1);

    expect(result).toEqual({ items: firstPage.items, totalItems: 30, totalPages: 3, currentPage: 1 });
    expect(result.items).toBe(firstPage.items);
    expect(mocks.getWorkspaceForms).toHaveBeenCalledExactlyOnceWith("workspace-remoto", { page: 1, pageSize: 12 });
  });

  it.each([[2, 2, 12], [999, 3, 6]])(
    "consulta primero el límite y luego la página remota para requested=%i, sin slice local", async (requested, expectedPage, length) => {
      const firstPage = remotePage(1);
      const requestedPage = remotePage(expectedPage);
      mocks.getWorkspaceForms.mockResolvedValueOnce(firstPage).mockResolvedValueOnce(requestedPage);

      const result = await getAdminWorkspaceFormsPage("workspace-remoto", requested);

      expect(mocks.getWorkspaceForms.mock.calls).toEqual([
        ["workspace-remoto", { page: 1, pageSize: 12 }],
        ["workspace-remoto", { page: expectedPage, pageSize: 12 }],
      ]);
      expect(result).toEqual({ items: requestedPage.items, totalItems: 30, totalPages: 3, currentPage: expectedPage });
      expect(result.items).toBe(requestedPage.items);
      expect(result.items).toHaveLength(length);
      expect(result.items[0].id).toBe(expectedPage === 2 ? "form-13" : "form-25");
    },
  );

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])("normaliza un número de página inválido %j", async (page) => {
    expect(await getAdminWorkspaceFormsPage("workspace-remoto", page)).toMatchObject({ currentPage: 1 });
    expect(mocks.getWorkspaceForms).toHaveBeenCalledExactlyOnceWith("workspace-remoto", { page: 1, pageSize: 12 });
  });

  it("corrige la página si el total remoto disminuye entre consultas", async () => {
    const corrected = { ...remotePage(2), total_items: 15, page_count: 2, items: remotePage(2).items.slice(0, 3) };
    mocks.getWorkspaceForms
      .mockResolvedValueOnce(remotePage(1))
      .mockResolvedValueOnce({ total_items: 15, page_count: 2, items: [] })
      .mockResolvedValueOnce(corrected);

    expect(await getAdminWorkspaceFormsPage("workspace-remoto", 999)).toEqual({
      items: corrected.items, totalItems: 15, totalPages: 2, currentPage: 2,
    });
    expect(mocks.getWorkspaceForms.mock.calls).toEqual([
      ["workspace-remoto", { page: 1, pageSize: 12 }],
      ["workspace-remoto", { page: 3, pageSize: 12 }],
      ["workspace-remoto", { page: 2, pageSize: 12 }],
    ]);
  });
});

describe("getAdminWorkspaceDetail", () => {
  it.each([["2", 2], ["999", 3]])("solo consulta formularios locales del workspace y la página remota solicitada %s", async (requested, expectedPage) => {
    const page = remotePage(expectedPage);
    const appForms = [{ id: "form-local", typeformId: page.items[0].id, description: "Local", createdAt: new Date("2026-11-02T12:00:00Z") }];
    mocks.formFindMany.mockResolvedValue(appForms);

    const result = await getAdminWorkspaceDetail("workspace-local", requested);

    expect(mocks.resolveWorkspaceTypeformId).toHaveBeenCalledExactlyOnceWith("workspace-alias");
    expect(mocks.getTypeformWorkspace).toHaveBeenCalledExactlyOnceWith("workspace-resuelto");
    expect(mocks.getWorkspaceForms.mock.calls).toEqual([
      ["workspace-remoto", { page: 1, pageSize: 12 }],
      ["workspace-remoto", { page: expectedPage, pageSize: 12 }],
    ]);
    expect(mocks.formFindMany).toHaveBeenCalledExactlyOnceWith({
      where: { workspaceId: "workspace-local", typeformId: { in: page.items.map(({ id }) => id) } },
      select: { id: true, typeformId: true, description: true, createdAt: true },
    });
    expect(mocks.formFindMany.mock.calls[0][0].where.typeformId.in).not.toContain("form-1");
    expect(result).toEqual({
      appWorkspace,
      typeformWorkspace,
      formsPage: { items: page.items, totalItems: 30, totalPages: 3, currentPage: expectedPage },
      appForms,
    });
  });

  it.each([undefined, "2abc", "2.5", " 2", ["2"], 2])("aplica parsing estricto al parámetro de página %j", async (page) => {
    expect(await getAdminWorkspaceDetail("workspace-local", page)).toMatchObject({ formsPage: { currentPage: 1 } });
    expect(mocks.getWorkspaceForms).toHaveBeenCalledExactlyOnceWith("workspace-remoto", { page: 1, pageSize: 12 });
  });

  it("devuelve null y no consulta Typeform ni formularios si no existe workspace", async () => {
    mocks.workspaceFindFirst.mockResolvedValue(null);

    expect(await getAdminWorkspaceDetail("inexistente", "2")).toBeNull();
    expect(mocks.resolveWorkspaceTypeformId).not.toHaveBeenCalled();
    expect(mocks.getTypeformWorkspace).not.toHaveBeenCalled();
    expect(mocks.getWorkspaceForms).not.toHaveBeenCalled();
    expect(mocks.formFindMany).not.toHaveBeenCalled();
  });

  it("conserva una página vacía sin consultar formularios locales", async () => {
    mocks.getWorkspaceForms.mockResolvedValue({ total_items: 0, page_count: 0, items: [] });

    expect(await getAdminWorkspaceDetail("workspace-local", "999")).toEqual({
      appWorkspace, typeformWorkspace,
      formsPage: { items: [], totalItems: 0, totalPages: 1, currentPage: 1 },
      appForms: [],
    });
    expect(mocks.getWorkspaceForms).toHaveBeenCalledExactlyOnceWith("workspace-remoto", { page: 1, pageSize: 12 });
    expect(mocks.formFindMany).not.toHaveBeenCalled();
  });

  it.each([
    "workspaceFindFirst", "resolveWorkspaceTypeformId", "getTypeformWorkspace", "getWorkspaceForms", "formFindMany",
  ] as const)("propaga sin reemplazar el error de %s", async (stage) => {
    const error = new Error(`Fallo simulado: ${stage}`);
    mocks[stage].mockRejectedValueOnce(error);

    await expect(getAdminWorkspaceDetail("workspace-local", "2")).rejects.toBe(error);
    if (stage !== "formFindMany") expect(mocks.formFindMany).not.toHaveBeenCalled();
  });

  it("propaga el error de la segunda consulta remota y no consulta formularios locales", async () => {
    const error = new Error("Segunda página no disponible");
    mocks.getWorkspaceForms.mockResolvedValueOnce(remotePage(1)).mockRejectedValueOnce(error);

    await expect(getAdminWorkspaceDetail("workspace-local", "2")).rejects.toBe(error);
    expect(mocks.formFindMany).not.toHaveBeenCalled();
  });
});

describe("AdminWorkspacesContent", () => {
  it.each([
    { currentPage: 2, itemsPerPage: 12, totalItems: 30, totalPages: 3 },
    { currentPage: 3, itemsPerPage: 12, totalItems: 30, totalPages: 3 },
    { currentPage: 1, itemsPerPage: 24, totalItems: 50, totalPages: 3 },
    { currentPage: 2, itemsPerPage: 24, totalItems: 50, totalPages: 3 },
    { currentPage: 1, itemsPerPage: 12, totalItems: 0, totalPages: 1 },
  ] as const)("renderiza la misma instantánea validada de filas y totales en página $currentPage", ({ currentPage, itemsPerPage, totalItems, totalPages }) => {
    const rows = totalItems === 0 ? [] : [appWorkspace];
    const pageSizeOptions = [12, 24, 48];

    const html = renderToStaticMarkup(AdminWorkspacesContent({
      page: { items: rows, currentPage, itemsPerPage, totalItems, totalPages },
      pageSizeOptions,
    }));

    expect(mocks.workspaceFindMany).not.toHaveBeenCalled();
    expect(html).toContain("Grid simulado");
    expect(html).toContain("Paginación simulada");
    expect(mocks.grid).toHaveBeenCalledOnce();
    const gridProps: ComponentProps<typeof AdminWorkspacesGrid> = mocks.grid.mock.calls[0][0];
    expect(gridProps.appWorkspaces).toBe(rows);
    expect(mocks.pagination).toHaveBeenCalledOnce();
    const paginationProps: ComponentProps<typeof Pagination> = mocks.pagination.mock.calls[0][0];
    expect(paginationProps).toEqual({
      currentPage, totalPages, totalItems, itemsPerPage,
      itemLabel: "workspaces", showPageSizeSelector: true, pageSizeOptions,
    });
    expect(mocks.formFindMany).not.toHaveBeenCalled();
    expect(mocks.getWorkspaceForms).not.toHaveBeenCalled();
  });

});