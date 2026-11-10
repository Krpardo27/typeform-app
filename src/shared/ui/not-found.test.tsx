import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("@/lib/getCurrentUser", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: mocks.back, replace: mocks.replace }),
}));

import NotFoundPage from "../../../app/not-found";
import { canNavigateBackWithinApp } from "./not-found-navigation";

beforeEach(() => vi.clearAllMocks());

describe("NotFoundPage", () => {
  it.each([
    { user: null, href: "/auth/login", label: "Iniciar sesión" },
    { user: { globalRole: "USER" }, href: "/workspaces/me", label: "Ir a mis workspaces" },
    { user: { globalRole: "SUPER_ADMIN" }, href: "/admin/workspaces", label: "Ir a administración" },
  ])("ofrece una sola salida principal: $label", async ({ user, href, label }) => {
    mocks.getCurrentUser.mockResolvedValue(user);

    const html = renderToStaticMarkup(await NotFoundPage());

    expect(html).toContain(`href="${href}"`);
    expect(html).toContain(label);
    expect(html.match(/<a\s/g)).toHaveLength(1);
    expect(html).toContain("No encontramos esta página");
    expect(html).toContain("Error 404");
    expect(html).toContain("Volver a la página anterior o al inicio");
    expect(mocks.getCurrentUser).toHaveBeenCalledOnce();
    expect(mocks.back).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});

describe("canNavigateBackWithinApp", () => {
  const current = "https://app.example.com/ruta-inexistente";

  it.each([
    "https://app.example.com/admin/workspaces",
    "https://app.example.com/workspaces/me?pagina=2",
    "https://app.example.com/",
  ])("permite volver a otra ruta del mismo origen: %s", (previous) => {
    expect(canNavigateBackWithinApp(current, previous)).toBe(true);
  });

  it.each([
    undefined,
    "",
    "no es una URL",
    "/admin/workspaces",
    "https://other.example.com/admin/workspaces",
    "https://app.example.com:8443/admin/workspaces",
    "http://app.example.com/admin/workspaces",
    "javascript:alert(1)",
    "https://app.example.com/ruta-inexistente",
    "https://app.example.com/ruta-inexistente?otra=1",
    "https://app.example.com/ruta-inexistente#seccion",
  ])("rechaza una entrada externa, desconocida o la misma ruta: %s", (previous) => {
    expect(canNavigateBackWithinApp(current, previous)).toBe(false);
  });

  it("rechaza una URL actual inválida", () => {
    expect(canNavigateBackWithinApp("invalida", "https://app.example.com/")).toBe(false);
  });
});