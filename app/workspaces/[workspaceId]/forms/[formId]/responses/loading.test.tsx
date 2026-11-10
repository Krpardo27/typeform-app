import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import WorkspaceFormResponsesLoading from "./loading";

describe("WorkspaceFormResponsesLoading", () => {
  it("mantiene dos métricas con la misma distribución que el resumen real", () => {
    const html = renderToStaticMarkup(<WorkspaceFormResponsesLoading />);
    const metrics = html.match(/<section\b[^>]*>[\s\S]*?<\/section>/)?.[0];
    expect(metrics).toContain("grid max-w-xl grid-cols-2 gap-3");
    expect(metrics?.match(/<article\b/g)).toHaveLength(2);
    expect(metrics).not.toContain("grid-cols-3");
    expect(metrics).toContain("min-w-0");
  });

  it("anuncia la carga sin leer la decoración y respeta movimiento reducido", () => {
    const html = renderToStaticMarkup(<WorkspaceFormResponsesLoading />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Cargando participantes"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("motion-reduce:animate-none");
    expect(html).toContain("w-72 max-w-full");
  });
});