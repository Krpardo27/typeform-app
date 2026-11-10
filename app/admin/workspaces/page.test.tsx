import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminWorkspacesPage from "./page";

const mocks = vi.hoisted(() => ({ page: vi.fn(), pagination: vi.fn(), legacyCount: vi.fn() }));
vi.mock("@/features/admin/workspaces/services/admin-workspaces-list.service", () => ({ getAdminWorkspacesPage: mocks.page }));
vi.mock("@/features/admin/workspaces/components/WorkspacesPageClient", () => ({ default: () => null }));
vi.mock("@/lib/prisma", () => ({ prisma: { workspace: { count: mocks.legacyCount } } }));
vi.mock("@/shared/components/Pagination", () => ({ default: (props: unknown) => {
  mocks.pagination(props);
  return <nav aria-label="Paginación" />;
} }));

const snapshot = {
  currentPage: 3, totalPages: 3, totalItems: 49, itemsPerPage: 24,
  items: [{ id: "local", name: "Radio disponible", typeformId: "remote-live", templateFormTypeformId: null, _count: { users: 2 } }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.page.mockResolvedValue(snapshot);
});

describe("AdminWorkspacesPage", () => {
  it("cabecera, tarjetas y paginación usan el mismo resultado validado por Typeform", async () => {
    const html = renderToStaticMarkup(await AdminWorkspacesPage({ searchParams: Promise.resolve({ page: "999", pageSize: "24" }) }));
    expect(mocks.page).toHaveBeenCalledExactlyOnceWith(999, 24);
    expect(mocks.legacyCount).not.toHaveBeenCalled();
    expect(html).toContain("49 workspaces registrados");
    expect(html).toContain("Radio disponible");
    expect(html).toContain('href="/admin/workspaces/remote-live"');
    expect(mocks.pagination).toHaveBeenCalledWith(expect.objectContaining({ currentPage: 3, totalPages: 3, totalItems: 49, itemsPerPage: 24 }));
  });

  it("un catálogo vacío correcto no deja un contador local obsoleto", async () => {
    mocks.page.mockResolvedValueOnce({ ...snapshot, items: [], currentPage: 1, totalPages: 1, totalItems: 0 });
    const html = renderToStaticMarkup(await AdminWorkspacesPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("0 workspaces registrados");
    expect(html).toContain("Todavía no hay workspaces");
    expect(html).not.toContain("Radio disponible");
    expect(mocks.legacyCount).not.toHaveBeenCalled();
  });

  it("propaga los errores sin mostrar un falso estado de catálogo vacío", async () => {
    const error = new Error("Typeform no disponible");
    mocks.page.mockRejectedValueOnce(error);
    await expect(AdminWorkspacesPage({ searchParams: Promise.resolve({}) })).rejects.toBe(error);
    expect(mocks.pagination).not.toHaveBeenCalled();
    expect(mocks.legacyCount).not.toHaveBeenCalled();
  });
});