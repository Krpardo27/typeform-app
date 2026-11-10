import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { templateFormOptions } from "../../../../../config/radio-workspaces";
import { WorkspaceCard } from "./WorkspaceCard";

const workspace = {
  id: "local-workspace-id",
  name: "Workspace de prueba",
  typeformId: "typeform-workspace-id",
  _count: { users: 1 },
};

describe("WorkspaceCard template origin", () => {
  it("muestra la radio y el ID de la plantilla guardada", () => {
    const template = templateFormOptions.find((option) => option.label === "CONCIERTO")!;
    const html = renderToStaticMarkup(
      <WorkspaceCard appWorkspace={{ ...workspace, templateFormTypeformId: template.value }} />,
    );

    expect(html).toContain("Plantilla de origen");
    expect(html).toContain("CONCIERTO");
    expect(html).toContain(`ID: ${template.value}`);
    expect(html).toContain('href="/admin/workspaces/typeform-workspace-id"');
    expect(html).toContain("1 usuario asignado");
    expect(html).toContain('alt="Logo de CONCIERTO"');
    expect(html).toContain("concierto.png");
    expect(html).toContain('width="80"');
    expect(html).toContain('height="80"');
    expect(html).toContain("object-contain");
  });

  it("conserva un ID no catalogado sin atribuirle una radio", () => {
    const html = renderToStaticMarkup(
      <WorkspaceCard appWorkspace={{ ...workspace, templateFormTypeformId: "plantilla-anterior" }} />,
    );

    expect(html).toContain("Formulario de Typeform");
    expect(html).toContain("ID: plantilla-anterior");
    expect(html).not.toContain("CONCIERTO");
    expect(html).not.toContain("<img");
  });

  it.each([null, "", "   "])("indica que no hay plantilla cuando el valor es %j", (templateFormTypeformId) => {
    const html = renderToStaticMarkup(
      <WorkspaceCard appWorkspace={{ ...workspace, templateFormTypeformId }} />,
    );

    expect(html).toContain("Sin plantilla registrada");
    expect(html).not.toContain("ID:");
  });
});