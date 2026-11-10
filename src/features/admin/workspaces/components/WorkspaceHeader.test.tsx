import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { radioWorkspaceTemplates } from "../../../../../config/radio-workspaces";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { WorkspaceFormsHeader } from "@/features/typeform/components/forms/WorkspaceFormsHeader";
import { WorkspaceFormDetailHeader } from "@/features/typeform/components/forms/WorkspaceFormDetailHeader";
import { WorkspaceFormResponsesHeader } from "@/features/typeform/components/responses/WorkspaceFormResponsesHeader";
import { NewWorkspaceFormHeader } from "@/features/typeform/components/creation/NewWorkspaceFormHeader";

const sourceRadio = radioWorkspaceTemplates.find((radio) => radio.name === "LOS40")!;
const clonedRadio = {
  name: "Promociones de verano",
  typeformId: "workspace-clonado",
  templateFormTypeformId: sourceRadio.templateFormTypeformId,
};

describe("WorkspaceHeader", () => {
  it("mantiene el título y el contexto sin duplicar el logo del shell", () => {
    const html = renderToStaticMarkup(<WorkspaceHeader title="Formularios" eyebrow={clonedRadio.name} />);
    expect(html).not.toContain("<img");
    expect(html).toContain("Promociones de verano");
    expect(html.match(/<h1\b/g)).toHaveLength(1);
  });

  it("no necesita metadatos de radio para mostrar un título", () => {
    const html = renderToStaticMarkup(<WorkspaceHeader title="Formularios" />);
    expect(html).not.toContain("<img");
    expect(html).toContain(">Formularios</h1>");
  });

  it("mantiene los usos sin radio, las acciones y el enlace de regreso", () => {
    const html = renderToStaticMarkup(<WorkspaceHeader
      title={<span>Un título largo</span>}
      backHref="/workspaces/radio/forms"
      backLabel="Volver a formularios"
      actions={<button type="button">Crear</button>}
    />);
    expect(html).toContain('href="/workspaces/radio/forms"');
    expect(html).toContain("Volver a formularios");
    expect(html).toContain('<button type="button">Crear</button>');
    expect(html).toContain("wrap-anywhere");
    expect(html).toContain("focus-visible:outline-[#A33116]");
    expect(html).not.toContain("bg-linear");
    expect(html).not.toContain("<img");
  });

  it("no crea un enlace de regreso sin una etiqueta", () => {
    const html = renderToStaticMarkup(<WorkspaceHeader title="Formulario" backHref="/workspaces/radio" />);
    expect(html).not.toContain("<a ");
  });

  it("mantiene título y acciones en una composición adaptable, sin imágenes", () => {
    const html = renderToStaticMarkup(<WorkspaceHeader title="Formularios" actions={<button type="button">Crear</button>} />);
    expect(html).toContain("flex-col gap-4 lg:flex-row");
    expect(html).toContain("lg:items-center lg:justify-between");
    expect(html).not.toContain("truncate");
    expect(html).not.toContain("<img");
  });
});

describe("integración con los encabezados de formularios", () => {
  const shared = { workspaceId: "workspace-local", workspaceName: clonedRadio.name };

  it.each([
    { label: "listado", header: <WorkspaceFormsHeader {...shared} totalItems={12} canCreateForms /> },
    { label: "creación", header: <NewWorkspaceFormHeader {...shared} /> },
    { label: "detalle", header: <WorkspaceFormDetailHeader {...shared} formId="form" formTitle="Concurso" /> },
    { label: "respuestas", header: <WorkspaceFormResponsesHeader {...shared} formTitle="Concurso" /> },
  ])("conserva contexto y enlaces locales en $label sin duplicar logos", ({ header }) => {
    const html = renderToStaticMarkup(header);
    expect(html).not.toContain("<img");
    expect(html).toContain("Promociones de verano");
    expect(html).toContain("/workspaces/workspace-local/forms");
    expect(html).not.toContain("/workspaces/workspace-clonado/forms");
  });

  it("mantiene una identificación por nombre en usos sin metadatos adicionales", () => {
    const html = renderToStaticMarkup(<WorkspaceFormsHeader workspaceId="workspace-local" workspaceName="Los 40" totalItems={0} canCreateForms={false} />);
    expect(html).toContain("Los 40");
    expect(html).not.toContain("<img");
    expect(html).toContain("Solo lectura");
    expect(html).not.toContain(">Crear<");
  });
});