import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceMobileDock } from "./WorkspaceMobileDock";
import { radioWorkspaceTemplates } from "../../../../../config/radio-workspaces";

const { pathname } = vi.hoisted(() => ({ pathname: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: pathname }));
vi.mock("@/shared/components/LogoutButton", () => ({ LogoutButton: () => <button type="button">Salir</button> }));

const workspaces = [
  { id: "radio-local", name: "Promociones", typeformId: "clonado", templateFormTypeformId: radioWorkspaceTemplates[1].templateFormTypeformId },
  { id: "otra", ...radioWorkspaceTemplates[0] },
];

beforeEach(() => pathname.mockReturnValue("/workspaces/radio-local/forms"));

function render() {
  return renderToStaticMarkup(<WorkspaceMobileDock workspaces={workspaces} currentWorkspaceId="radio-local" />);
}

function formsLink(html: string) {
  return html.match(/<a\b[^>]*href="\/workspaces\/radio-local\/forms"[^>]*>[\s\S]*?<\/a>/)?.[0];
}

describe("WorkspaceMobileDock", () => {
  it("muestra el logo actual y logos con nombres completos en el selector", () => {
    const html = render();
    expect(html).toContain("los40.png");
    const summary = html.match(/<summary\b[^>]*>[\s\S]*?<\/summary>/)?.[0];
    expect(summary).toContain("object-contain");
    expect(html.match(/<img\b/g)).toHaveLength(workspaces.length + 1);
    expect(html).toContain('aria-label="Cambiar radio. Actual: Promociones"');
    expect(html).toContain("concierto.png");
    expect(html).toContain(">Promociones</span>");
    expect(html).toContain('aria-label="Navegación del workspace"');
    expect(summary).not.toContain(">Promociones</span>");
  });

  it("con una sola radio muestra únicamente el logo, sin nombre visible ni selector", () => {
    const html = renderToStaticMarkup(<WorkspaceMobileDock workspaces={[workspaces[0]]} currentWorkspaceId="radio-local" />);
    expect(html).toContain('role="img" aria-label="Radio actual: Promociones"');
    expect(html).toContain('title="Promociones"');
    expect(html).toContain("los40.png");
    expect(html).not.toContain("<details");
    expect(html).not.toContain("<summary");
    expect(html).not.toContain(">Promociones</span>");
    expect(formsLink(html)).toContain('aria-current="page"');
  });

  it("mantiene el selector si todavía no se ha entrado al único workspace disponible", () => {
    const html = renderToStaticMarkup(<WorkspaceMobileDock workspaces={[workspaces[0]]} />);
    expect(html).toContain("<details");
    expect(html).toContain('href="/workspaces/radio-local"');
  });

  it.each([
    "/workspaces/radio-local/forms/new",
    "/workspaces/radio-local/forms/form",
    "/workspaces/radio-local/forms/form/responses",
    "/workspaces/radio-local/responses",
  ])("mantiene Formularios activo en %s", (path) => {
    pathname.mockReturnValue(path);
    expect(formsLink(render())).toContain('aria-current="location"');
  });

  it("marca la página exacta y normaliza la barra final", () => {
    pathname.mockReturnValue("/workspaces/radio-local/forms/");
    expect(formsLink(render())).toContain('aria-current="page"');
  });

  it.each(["/workspaces/radio-local/forms-other", "/workspaces/otro/forms"])("no activa una sección por un prefijo ajeno: %s", (path) => {
    pathname.mockReturnValue(path);
    expect(formsLink(render())).not.toContain("aria-current");
  });

  it("evita cuatro columnas vacías cuando no existe un workspace actual", () => {
    const html = renderToStaticMarkup(<WorkspaceMobileDock workspaces={[]} />);
    expect(html).toContain("grid-cols-2");
    expect(html).not.toContain("grid-cols-4");
    expect(html).not.toContain("/workspaces/undefined");
    expect(html).toContain("No tienes radios asignadas.");
    expect(html).toContain('aria-label="Elegir radio"');
  });

  it("usa el contexto de sección si la ruta aún no está disponible", () => {
    pathname.mockReturnValue(null);
    const html = renderToStaticMarkup(<WorkspaceMobileDock workspaces={workspaces} currentWorkspaceId="radio-local" currentSection="forms" />);
    expect(formsLink(html)).toContain('aria-current="location"');
  });

  it("mantiene details nativo cerrado, foco visible y el menú anclado al ancho del dock", () => {
    const html = render();
    expect(html).toContain("<details");
    expect(html).not.toMatch(/<details\b[^>]*\bopen=/);
    expect(html).toContain("absolute inset-x-0 bottom-full");
    expect(html).toContain("overscroll-contain");
    expect(html).toContain("safe-area-inset-bottom");
    expect(html).toContain("focus-visible:outline-[#A33116]");
    expect(html).toContain("motion-reduce:transition-none");
    expect(html).not.toContain("#7C3AED");
    expect(html).not.toContain("bg-linear");
  });
});