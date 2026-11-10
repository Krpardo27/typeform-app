import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceShellFrame } from "./WorkspaceShellFrame";

const mocks = vi.hoisted(() => ({ segment: vi.fn() }));
vi.mock("next/navigation", () => ({ useSelectedLayoutSegment: mocks.segment }));
vi.mock("./WorkspaceSidebar", () => ({ WorkspaceSidebar: ({ currentSection }: { currentSection: string }) => <aside data-section={currentSection} /> }));
vi.mock("./WorkspaceMobileDock", () => ({ WorkspaceMobileDock: () => <nav>Navegación móvil</nav> }));
vi.mock("@/features/admin/components/GlobalSearchForm", () => ({
  default: ({ workspaceHrefMode, currentWorkspaceId, includeForms }: { workspaceHrefMode: string; currentWorkspaceId?: string; includeForms: boolean }) => (
    <form aria-label="Buscar" data-mode={workspaceHrefMode} data-workspace={currentWorkspaceId} data-forms={includeForms} />
  ),
}));

beforeEach(() => mocks.segment.mockReturnValue(null));

describe("WorkspaceShellFrame", () => {
  it.each([
    ["Inicio/Panel", null, "home"],
    ["listado de formularios", "forms", "forms"],
    ["creación de formulario", "forms", "forms"],
    ["detalle de formulario", "forms", "forms"],
    ["respuestas de formulario", "forms", "forms"],
    ["ruta de respuestas", "responses", "forms"],
  ])("mantiene el buscador del layout en %s", (_view, segment, section) => {
    mocks.segment.mockReturnValue(segment);
    const html = renderToStaticMarkup(<WorkspaceShellFrame
      user={{ name: "Editor", email: "editor@example.test" }}
      workspaces={[]}
      currentWorkspaceId="radio-autorizada"
    ><h1>Contenido de la vista</h1></WorkspaceShellFrame>);
    expect(html.match(/aria-label="Buscar"/g)).toHaveLength(1);
    expect(html).toContain('data-workspace="radio-autorizada"');
    expect(html).toContain('data-mode="workspaces"');
    expect(html).toContain('data-forms="true"');
    expect(html).toContain(`data-section="${section}"`);
    expect(html).toContain("Contenido de la vista");
  });
});