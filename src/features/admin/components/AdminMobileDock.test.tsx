import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminMobileDock from "./AdminMobileDock";

const { pathname } = vi.hoisted(() => ({ pathname: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: pathname }));
vi.mock("@/lib/auth-client", () => ({ authClient: { signOut: vi.fn() } }));
vi.mock("@/shared/ui/LoaderRedirect", () => ({ default: () => null }));

beforeEach(() => pathname.mockReturnValue("/admin/dashboard"));

function getLink(html: string, href: string) {
  return html.match(new RegExp(`<a\\b[^>]*href="${href}"[^>]*>[\\s\\S]*?</a>`))?.[0];
}

describe("AdminMobileDock", () => {
  it("enlaza Inicio directamente al dashboard sin redirección", () => {
    const html = renderToStaticMarkup(<AdminMobileDock />);
    expect(getLink(html, "/admin/dashboard")).toContain('aria-current="page"');
    expect(html).not.toContain('href="/admin"');
    expect(getLink(html, "/admin/workspaces")).toContain('aria-label="Radios"');
    expect(getLink(html, "/admin/workspaces")).toContain('title="Radios"');
    expect(html).not.toContain("<img");
  });

  it.each(["/admin/workspaces/radio", "/admin/users/user", "/admin/miembros/nuevo", "/admin/auditoria/evento"])(
    "marca la sección de la ruta anidada %s", (path) => {
      pathname.mockReturnValue(path);
      const html = renderToStaticMarkup(<AdminMobileDock />);
      const parent = path.slice(0, path.lastIndexOf("/"));
      expect(getLink(html, parent)).toContain('aria-current="location"');
      expect(html.match(/aria-current=/g)).toHaveLength(1);
    },
  );

  it.each([null, "/admin/users-other", "/admin/workspaces-other"])("no marca prefijos incorrectos ni valores ausentes: %s", (path) => {
    pathname.mockReturnValue(path);
    expect(renderToStaticMarkup(<AdminMobileDock />)).not.toContain("aria-current");
  });

  it("normaliza barras finales y bloquea solo la navegación exacta", () => {
    pathname.mockReturnValue("/admin/users/");
    type LinkProps = { href: string; onNavigate: (event: { preventDefault: () => void }) => void; onClick?: unknown };
    const links = AdminMobileDock().props.children.props.children.props.children[0] as ReactElement<LinkProps>[];
    const link = links.find((link) => link.props.href === "/admin/users")!;
    const preventDefault = vi.fn();
    link.props.onNavigate({ preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(link.props.onClick).toBeUndefined();

    pathname.mockReturnValue("/admin/users/user");
    const nestedLinks = AdminMobileDock().props.children.props.children.props.children[0] as ReactElement<LinkProps>[];
    preventDefault.mockClear();
    nestedLinks.find((link) => link.props.href === "/admin/users")!.props.onNavigate({ preventDefault });
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it("mantiene safe area, foco y cinco espacios dentro del viewport", () => {
    const html = renderToStaticMarkup(<AdminMobileDock />);
    expect(html).toContain('aria-label="Administración móvil"');
    expect(html).toContain("safe-area-inset-bottom");
    expect(html).toContain("grid-cols-5");
    expect(html).not.toContain("grid-cols-6");
    expect(html).toContain("w-full min-w-0 max-w-dvw");
    expect(html).toContain("min-h-16");
    expect(html).toContain("focus-visible:outline-[#A33116]");
    expect(html).toContain("motion-reduce:transition-none");
    expect(html).not.toContain("bg-linear");
    expect(html).not.toContain("backdrop-blur");
  });

  it("reserva Salir como quinto acceso y agrupa Miembros/Auditoría en Más", () => {
    const html = renderToStaticMarkup(<AdminMobileDock />);
    for (const label of ["Inicio", "Radios", "Usuarios", "Más"]) {
      expect(html).toContain(`<span class="max-w-full text-center tracking-tight">${label}</span>`);
    }
    expect(html.match(/<a\b/g)).toHaveLength(5);
    expect(html.match(/<button\b/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Cerrar sesión"');
    expect(html).toContain(">Salir</span>");
    expect(html).toContain('aria-busy="false"');
    expect(html).toContain("self-stretch *:h-full *:w-full *:min-w-0");
    expect(html).toContain("min-[390px]:text-xs");
    expect(html).toContain('aria-label="Más opciones de administración"');
    expect(html).not.toMatch(/<details\b[^>]*\bopen=/);
    const mainLinks = AdminMobileDock().props.children.props.children.props.children[0] as ReactElement[];
    expect(mainLinks).toHaveLength(3);
    const popup = html.match(/<details\b[^>]*>[\s\S]*?<\/details>/)![0];
    expect(popup).toContain('href="/admin/miembros"');
    expect(popup).toContain('href="/admin/auditoria"');
    const icons = html.match(/<svg\b[^>]*>/g)!;
    expect(icons).toHaveLength(7);
    for (const icon of icons) {
      expect(icon).toContain("size-5");
      expect(icon).toContain('aria-hidden="true"');
    }
  });

  it("remonta Más al navegar para que no quede abierto en la nueva página", () => {
    const before = AdminMobileDock().props.children.props.children.props.children[1] as ReactElement;
    pathname.mockReturnValue("/admin/auditoria");
    const after = AdminMobileDock().props.children.props.children.props.children[1] as ReactElement;
    expect(before.key).not.toBe(after.key);
  });
});