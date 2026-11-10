import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspacePanelLink } from "./WorkspacePanelLink";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname }));

beforeEach(() => {
  usePathname.mockReturnValue("/workspaces/radio-a");
});

describe("WorkspacePanelLink", () => {
  it.each(["/workspaces/radio-a", "/workspaces/radio-a/"])("evita navegar de nuevo desde la página activa %s", (pathname) => {
    usePathname.mockReturnValue(pathname);
    const link = WorkspacePanelLink({ href: "/workspaces/radio-a", focusClassName: "focus-visible:outline-2" });
    const preventDefault = vi.fn();
    link.props.onNavigate({ preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(link.props["aria-current"]).toBeUndefined();
    expect(link.props.href).toBe("/workspaces/radio-a");
  });

  it("permite volver al panel desde Formularios", () => {
    usePathname.mockReturnValue("/workspaces/radio-a/forms");
    const link = WorkspacePanelLink({ href: "/workspaces/radio-a", focusClassName: "focus-visible:outline-2" });
    const preventDefault = vi.fn();
    link.props.onNavigate({ preventDefault });
    expect(preventDefault).not.toHaveBeenCalled();
    expect(link.props["aria-current"]).toBeUndefined();
  });

  it("no bloquea salir hacia el panel administrativo", () => {
    const link = WorkspacePanelLink({ href: "/admin/workspaces", focusClassName: "focus-visible:outline-2" });
    const preventDefault = vi.fn();
    link.props.onNavigate({ preventDefault });
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it("conserva un enlace real y estilos de foco para teclado y nuevas pestañas", () => {
    const html = renderToStaticMarkup(<WorkspacePanelLink href="/workspaces/radio-a" focusClassName="focus-visible:outline-2" />);
    expect(html).toContain('href="/workspaces/radio-a"');
    expect(html).not.toContain("aria-current");
    expect(html).not.toContain("bg-[#FFF1EB]");
    expect(html).toContain("hover:bg-[#F5F5F5]");
    expect(html).toContain("focus-visible:outline-2");
    expect(html).not.toContain("cursor-default");
  });
});