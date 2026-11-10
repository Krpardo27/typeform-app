import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminWorkspacesNav from "./AdminWorkspacesNav";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname }));

beforeEach(() => {
  usePathname.mockReturnValue("/admin/dashboard");
});

function getLink(html: string, href: string) {
  return html.match(new RegExp(`<a\\b[^>]*href="${href}"[^>]*>[\\s\\S]*?</a>`))?.[0];
}

describe("AdminWorkspacesNav", () => {
  it.each([
    ["/admin/dashboard", "Dashboard"],
    ["/admin/workspaces", "Workspaces"],
    ["/admin/users", "Usuarios"],
    ["/admin/miembros", "Agregar miembros"],
    ["/admin/auditoria", "Auditoría"],
  ])("identifica la página exacta %s", (path, label) => {
    usePathname.mockReturnValue(path);
    const html = renderToStaticMarkup(<AdminWorkspacesNav />);
    const link = getLink(html, path);
    expect(link).toContain(label);
    expect(link).toContain('aria-current="page"');
    expect(link).toContain("bg-[#FFF1EB]");
    expect(html.match(/aria-current=/g)).toHaveLength(1);
  });

  it.each(["/admin/workspaces/radio", "/admin/users/user"])("conserva un enlace navegable al listado desde %s", (path) => {
    usePathname.mockReturnValue(path);
    const html = renderToStaticMarkup(<AdminWorkspacesNav />);
    const link = getLink(html, path.slice(0, path.lastIndexOf("/")));
    expect(link).toContain('aria-current="location"');
    expect(link).not.toContain("cursor-default");
  });

  it.each(["/admin/users-archive", "/admin/workspaces-other", "/admin/dashboard-other", null])(
    "no marca falsos prefijos ni rutas desconocidas: %s", (path) => {
      usePathname.mockReturnValue(path);
      expect(renderToStaticMarkup(<AdminWorkspacesNav />)).not.toContain("aria-current");
    },
  );

  it("normaliza la barra final", () => {
    usePathname.mockReturnValue("/admin/dashboard/");
    expect(getLink(renderToStaticMarkup(<AdminWorkspacesNav />), "/admin/dashboard"))
      .toContain('aria-current="page"');
  });

  it("cancela únicamente navegar al listado que ya está abierto", () => {
    usePathname.mockReturnValue("/admin/users");
    const preventDefault = vi.fn();
    const link = AdminWorkspacesNav().props.children.props.children[2].props.children;
    link.props.onNavigate({ preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();

    usePathname.mockReturnValue("/admin/users/user");
    preventDefault.mockClear();
    const parentLink = AdminWorkspacesNav().props.children.props.children[2].props.children;
    parentLink.props.onNavigate({ preventDefault });
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it("ofrece estructura de lista, foco visible y movimiento reducido", () => {
    const html = renderToStaticMarkup(<AdminWorkspacesNav />);
    expect(html).toContain('aria-label="Administración"');
    expect(html.match(/<li\b/g)).toHaveLength(5);
    expect(html).toContain("focus-visible:outline-[#A33116]");
    expect(html).toContain("motion-reduce:transition-none");
    expect(html).toContain('aria-hidden="true"');
  });
});