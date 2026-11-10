import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ResponseExportButton } from "./ResponseExportButton";

describe("ResponseExportButton", () => {
  it.each([true, false])("renderiza un botón sin URL que permita saltarse el bloqueo (canExport=%s)", (canExport) => {
    const html = renderToStaticMarkup(
      <ResponseExportButton baseHref="/export" scope="participants" variant="participants" label="Participantes" canExport={canExport} />,
    );

    expect(html).toContain('<button type="button"');
    expect(html).toContain(`aria-disabled="${!canExport}"`);
    expect(html).toContain('aria-label="Exportar participantes a Excel"');
    expect(html).toContain('aria-busy="false"');
    expect(html).not.toContain("href=");
    expect(html).not.toContain("<a ");
  });

  it.each([
    { winnerFlowToken: undefined, requestWinnerFlowToken: undefined, allowed: false },
    { winnerFlowToken: "active-flow", requestWinnerFlowToken: undefined, allowed: true },
    { winnerFlowToken: undefined, requestWinnerFlowToken: async () => "saved-flow", allowed: true },
  ])("ganadores solo se habilita con grant o preparación explícita: $allowed", ({ allowed, ...authorization }) => {
    const html = renderToStaticMarkup(<ResponseExportButton
      baseHref="/export" scope="winners" variant="winners" label="Ganadores" canExport {...authorization}
    />);
    expect(html).toContain(`aria-disabled="${!allowed}"`);
    expect(html).not.toContain("href=");
    expect(html).not.toContain("active-flow");
    expect(html).not.toContain("saved-flow");
    expect(html).not.toContain("<a ");
  });
});