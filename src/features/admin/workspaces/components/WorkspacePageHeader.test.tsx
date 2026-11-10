import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorkspacePageHeader } from "./WorkspacePageHeader";
import { WorkspaceRadioLogo } from "./WorkspaceRadioLogo";
import { radioWorkspaceTemplates } from "../../../../../config/radio-workspaces";

describe("WorkspacePageHeader", () => {
  it("muestra el logo de la radio en su detalle sin cambiar título, descripción o enlaces", () => {
    const html = renderToStaticMarkup(<WorkspacePageHeader
      title="CONCIERTO"
      radio={radioWorkspaceTemplates[0]}
      description={<p>Plantilla de origen</p>}
      actions={<button type="button">Acción</button>}
      backHref="/admin/workspaces"
    />);
    expect(html).toContain('alt="Logo de CONCIERTO"');
    const image = html.match(/<img\b[^>]*>/)?.[0];
    const width = image?.match(/\bwidth="(\d+)"/)?.[1];
    expect(Number(width)).toBeGreaterThan(0);
    expect(image).toContain(`height="${width}"`);
    expect(html).toContain("Plantilla de origen");
    expect(html).toContain('href="/admin/workspaces"');
    expect(html).toContain("sm:flex-row sm:items-center");
    expect(html).toContain('<button type="button">Acción</button>');
  });

  it("no atribuye una radio al listado general", () => {
    const html = renderToStaticMarkup(<WorkspacePageHeader title="Workspaces disponibles" />);
    expect(html).not.toContain("<img");
    expect(html).toContain("Administración");
  });
});

describe("WorkspaceRadioLogo", () => {
  it("mantiene el nombre para workspaces desconocidos en vez de inventar un logo", () => {
    const workspace = { name: "Otro workspace", typeformId: "otro" };
    const html = renderToStaticMarkup(<WorkspaceRadioLogo workspace={workspace} />);
    expect(html).toContain("Otro workspace");
    expect(html).not.toContain("<img");
    expect(renderToStaticMarkup(<WorkspaceRadioLogo workspace={workspace} fallback="none" />)).toBe("");
  });

  it.each([32, 40, 48, 64, 80] as const)("reserva %s píxeles sin recortar ni deformar", (size) => {
    const html = renderToStaticMarkup(<WorkspaceRadioLogo workspace={radioWorkspaceTemplates[0]} size={size} />);
    expect(html).toContain(`width="${size}"`);
    expect(html).toContain(`height="${size}"`);
    expect(html).toContain("object-contain");
  });
});