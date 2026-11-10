import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorkspaceHomeActions } from "./WorkspaceHomeActions";
import { WorkspaceHomeLoading } from "./WorkspaceHomeLoading";

function render(canCreateForms: boolean) {
  return renderToStaticMarkup(<WorkspaceHomeActions workspaceId="radio-local" canCreateForms={canCreateForms} />);
}

describe("WorkspaceHomeActions", () => {
  it("ofrece creación y consulta con destinos del workspace actual", () => {
    const html = render(true);
    expect(html).toContain('href="/workspaces/radio-local/forms/new"');
    expect(html).toContain('href="/workspaces/radio-local/forms"');
    expect(html.match(/<a\b/g)).toHaveLength(2);
    expect(html).toContain("Duplica un formulario existente para crear uno nuevo.");
    expect(html).not.toContain("No tienes permiso");
  });

  it("sin permiso no genera un enlace ni un botón de creación", () => {
    const html = render(false);
    expect(html).not.toContain("/forms/new");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("tabindex");
    expect(html).toContain("Crear formulario</h2>");
    expect(html).toContain("No tienes permiso para crear formularios en esta radio.");
    expect(html).not.toContain("solo para");
    expect(html).toContain('href="/workspaces/radio-local/forms"');
    expect(html.match(/<a\b/g)).toHaveLength(1);
  });

  it.each([true, false])("describe el paso por formularios para consultar respuestas (creación: %s)", (canCreateForms) => {
    const html = render(canCreateForms);
    expect(html).toContain("Formularios y respuestas</h2>");
    expect(html).toContain("Selecciona un formulario para consultar sus respuestas.");
    expect(html).not.toContain("tabla principal");
    expect(html).not.toContain('href="/workspaces/radio-local/responses"');
  });

  it.each([true, false])("mantiene dos columnas adaptables y textos que pueden ajustarse (creación: %s)", (canCreateForms) => {
    const html = render(canCreateForms);
    expect(html).toContain('aria-label="Acciones del workspace"');
    expect(html).toContain("md:grid-cols-2");
    expect(html).not.toContain("grid-cols-3");
    expect(html).toContain("min-w-0 flex-1 wrap-anywhere");
    expect(html).toContain("size-10 shrink-0");
    expect(html).not.toContain("opacity-80");
    expect(html).not.toContain("#7C3AED");
  });

  it("anima solo las flechas al pasar sobre cada tarjeta y respeta movimiento reducido", () => {
    const html = render(true);
    const links = html.match(/<a\b[^>]*>/g)!;
    for (const link of links) {
      expect(link).toMatch(/class="[^"]*\bgroup\b/);
      expect(link).not.toContain("translate-x");
    }
    const arrows = html.match(/<svg\b[^>]*group-hover:translate-x-1[^>]*>/g)!;
    expect(arrows).toHaveLength(2);
    for (const arrow of arrows) {
      expect(arrow).toContain("transition-[color,translate]");
      expect(arrow).toContain("duration-300");
      expect(arrow).toContain("ease-out");
      expect(arrow).toContain("motion-reduce:translate-x-0");
      expect(arrow).toContain("motion-reduce:transition-none");
      expect(arrow).not.toContain("group-hover:bg-");
    }
  });

  it("todos los enlaces tienen foco visible y respetan movimiento reducido", () => {
    const html = render(true);
    const links = html.match(/<a\b[^>]*>/g)!;
    for (const link of links) {
      expect(link).toContain("focus-visible:outline-[#A33116]");
      expect(link).toContain("motion-reduce:transition-none");
    }
    const icons = html.match(/<svg\b[^>]*>/g)!;
    expect(icons).toHaveLength(4);
    for (const icon of icons) expect(icon).toContain('aria-hidden="true"');
  });
});

describe("WorkspaceHomeLoading", () => {
  it("mantiene dos acciones y la misma cuadrícula adaptable", () => {
    const html = renderToStaticMarkup(<WorkspaceHomeLoading />);
    expect(html.match(/<article\b/g)).toHaveLength(2);
    expect(html).toContain("md:grid-cols-2");
    expect(html).not.toContain("grid-cols-3");
    expect(html).toContain("min-w-0 flex-1");
    expect(html).toContain("w-56 max-w-full");
    expect(html).toContain("motion-reduce:animate-none");
    expect(html).toContain('aria-hidden="true"');
  });
});