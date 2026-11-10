import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorkspaceFormResponsesStats } from "./WorkspaceFormResponsesStats";

describe("WorkspaceFormResponsesStats", () => {
  it("muestra solo participantes y ganadores en dos bloques compactos", () => {
    const html = renderToStaticMarkup(
      <WorkspaceFormResponsesStats totalParticipants={12345} selectedWinnersCount={3} />,
    );
    expect(html).toContain('aria-label="Resumen de participantes"');
    expect(html).toContain("grid max-w-xl grid-cols-2 gap-3");
    expect(html.match(/<dt\b/g)).toHaveLength(2);
    expect(html).toContain("Participantes");
    expect(html).not.toContain("Cargados en esta página");
    expect(html).toContain("Ganadores seleccionados");
    expect(html).toContain(new Intl.NumberFormat("es-CL").format(12345));
    expect(html).not.toContain("flex-wrap");
    expect(html).not.toContain("shadow-");
  });

  it("muestra cero sin sustituirlo por ausencia de datos", () => {
    const html = renderToStaticMarkup(
      <WorkspaceFormResponsesStats totalParticipants={0} selectedWinnersCount={0} />,
    );
    expect(html.match(/>0<\/dd>/g)).toHaveLength(2);
  });
});