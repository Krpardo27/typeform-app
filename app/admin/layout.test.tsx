import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  redirect: vi.fn((path: string): never => { throw Object.assign(new Error("REDIRECT"), { path }); }),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/getCurrentUser", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/features/admin/components/AdminMobileDock", () => ({ default: () => <nav aria-label="Administración móvil" /> }));
vi.mock("@/features/admin/workspaces/components/AdminWorkspacesNav", () => ({ default: () => <nav aria-label="Administración" /> }));
vi.mock("@/features/admin/components/GlobalSearchForm", () => ({ default: () => <form aria-label="Buscar" /> }));
vi.mock("@/shared/components/LogoutButton", () => ({ LogoutButton: () => <button type="button">Cerrar sesión</button> }));

import AdminLayout from "./layout";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ name: "  Ana Pérez  ", email: "ana@example.com", globalRole: "SUPER_ADMIN" });
});

describe("AdminLayout", () => {
  it("redirige al login sin sesión antes de renderizar contenido protegido", async () => {
    mocks.user.mockResolvedValue(null);
    await expect(AdminLayout({ children: <p>Privado</p> })).rejects.toMatchObject({ path: "/auth/login" });
  });

  it("redirige a quien no es superadministrador", async () => {
    mocks.user.mockResolvedValue({ globalRole: "USER" });
    await expect(AdminLayout({ children: <p>Privado</p> })).rejects.toMatchObject({ path: "/workspaces/me" });
  });

  it("mantiene navegación con scroll y cuenta fija sin presentar el título como botón", async () => {
    const html = renderToStaticMarkup(await AdminLayout({ children: <p>Contenido</p> }));
    expect(html).toContain('aria-label="Barra lateral de administración"');
    expect(html).toContain("Panel de administración");
    expect(html).toContain("min-h-0 flex-1 overflow-y-auto overscroll-contain");
    expect(html).toContain("shrink-0 border-t");
    expect(html).toContain("Cerrar sesión");
    expect(html).toContain("Contenido");
    expect(html).toContain('title="Ana Pérez"');
    expect(html).toContain('title="ana@example.com"');
    expect(html.match(/aria-label="Cuenta actual"/g)).toHaveLength(1);
    expect(html.indexOf('aria-label="Cuenta actual"')).toBeLessThan(html.indexOf('aria-label="Buscar"'));
    expect(html).toContain("lg:hidden");
    expect(html).not.toContain("<svg viewBox");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it.each([
    [{ name: "   ", email: "ana@example.com" }, "ana"],
    [{ name: null, email: "ana@example.com" }, "ana"],
    [{ email: "" }, "Usuario"],
  ])("presenta una alternativa válida de nombre: %j", async (user, expected) => {
    mocks.user.mockResolvedValue({ ...user, globalRole: "SUPER_ADMIN" });
    const html = renderToStaticMarkup(await AdminLayout({ children: null }));
    expect(html).toContain(`title="${expected}"`);
  });
});