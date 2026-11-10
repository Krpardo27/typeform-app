import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorkspaceHomeHeader } from "./WorkspaceHomeHeader";
import { radioWorkspaceTemplates } from "../../../../../config/radio-workspaces";

describe("WorkspaceHomeHeader", () => {
  it.each(radioWorkspaceTemplates)("muestra $name sin repetir el logo que pertenece al shell", (radio) => {
    const html = renderToStaticMarkup(<WorkspaceHomeHeader
      workspaceName={radio.name}
      workspaceRole="EDITOR"
    />);
    expect(html).toContain(`>${radio.name}</h1>`);
    expect(html).not.toContain("<img");
    expect(html).toContain("Editor</dd>");
  });

  it("deja la identidad visual al shell tanto para nombres conocidos como desconocidos", () => {
    expect(renderToStaticMarkup(<WorkspaceHomeHeader workspaceName="Radio ADN" workspaceRole="VIEWER" />))
      .not.toContain("<img");
    expect(renderToStaticMarkup(<WorkspaceHomeHeader workspaceName="Radio desconocida" workspaceRole="VIEWER" />))
      .not.toContain("<img");
  });

  it("presenta título, rol de editor y descripción acorde con sus permisos", () => {
    const html = renderToStaticMarkup(
      <WorkspaceHomeHeader workspaceName="  Radio A  " workspaceRole="EDITOR" />,
    );
    expect(html).toContain(">Radio A</h1>");
    expect(html).toContain("Editor</dd>");
    expect(html).toContain("Gestiona los formularios");
    expect(html).not.toContain("bg-[#FFF1EB]");
    expect(html).not.toContain("Usuario");
    expect(html).not.toContain("sm:text-3xl");
    expect(html).not.toContain("space-y-12");
    expect(html).not.toContain("text-md");
  });

  it("un lector recibe una descripción de consulta, no de administración", () => {
    const html = renderToStaticMarkup(
      <WorkspaceHomeHeader workspaceName="Radio" workspaceRole="VIEWER" />,
    );
    expect(html).toContain("Lector</dd>");
    expect(html).toContain("Consulta los formularios y las respuestas");
    expect(html).not.toContain("Gestiona");
  });

  it.each(["", "   "])("ofrece alternativas para datos vacíos: %j", (value) => {
    const html = renderToStaticMarkup(
      <WorkspaceHomeHeader workspaceName={value} workspaceRole={value} />,
    );
    expect(html).toContain("Radio sin nombre");
    expect(html).toContain("Sin rol definido");
  });

  it("conserva los nombres largos sin truncarlos ni duplicar la información de la cuenta", () => {
    const name = "Radio de nombre extenso ".repeat(6);
    const html = renderToStaticMarkup(
      <WorkspaceHomeHeader workspaceName={name} workspaceRole="EDITOR" />,
    );
    expect(html).toContain(name.trim());
    expect(html).toContain("wrap-anywhere");
    expect(html).not.toContain("truncate");
    expect(html).toContain("<dl");
    expect(html.match(/<dt\b/g)).toHaveLength(1);
    expect(html).not.toContain("Correo");
  });

  it("escapa el contenido y mantiene el icono decorativo oculto a lectores de pantalla", () => {
    const html = renderToStaticMarkup(
      <WorkspaceHomeHeader workspaceName="<Radio & Marca>" workspaceRole="EDITOR" />,
    );
    expect(html).toContain("&lt;Radio &amp; Marca&gt;");
    expect(html).toContain('aria-hidden="true"');
  });
});