import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AuditDateFilter } from "./AuditDateFilter";
import { formatAuditDate } from "../utils/audit-date-range";

describe("AuditDateFilter", () => {
  it("mantiene GET y campos opcionales, sin Limpiar cuando no hay filtro", () => {
    const html = renderToStaticMarkup(<AuditDateFilter />);
    expect(html).toContain('action="/admin/auditoria"');
    expect(html).toContain('method="get"');
    expect(html.match(/type="date"/g)).toHaveLength(2);
    expect(html).toContain('name="from"');
    expect(html).toContain('name="to"');
    expect(html).not.toContain("required");
    expect(html).not.toContain("Limpiar");
    expect(html).toContain("Fechas en UTC");
  });

  it("muestra fechas legibles, conserva valores ISO y permite limpiar", () => {
    const html = renderToStaticMarkup(<AuditDateFilter from="2026-11-01" to="2026-11-04" />);
    expect(html).toContain('value="2026-11-01"');
    expect(html).toContain(`Desde ${formatAuditDate("2026-11-01")}`);
    expect(html).toContain(`Hasta ${formatAuditDate("2026-11-04")}`);
    expect(html).toContain('href="/admin/auditoria"');
    expect(html).toContain("Limpiar");
  });

  it("asocia el error a ambos campos sin presentar el filtro como aplicado", () => {
    const html = renderToStaticMarkup(<AuditDateFilter from="2026-11-05" to="2026-11-04" error="Rango inválido" />);
    expect(html).toContain('role="alert"');
    expect(html.match(/aria-invalid="true"/g)).toHaveLength(2);
    expect(html).toContain('aria-describedby="audit-date-hint audit-date-error"');
    expect(html).not.toContain("Filtro activo:");
    expect(html).toContain("Limpiar");
  });

  it("permite limpiar también los parámetros rechazados sin fechas normalizadas", () => {
    const html = renderToStaticMarkup(<AuditDateFilter error="Fecha inválida" />);
    expect(html).toContain("Limpiar");
    expect(html).toContain("Fecha inválida");
  });

  it("reinicia los valores nativos al aplicar o limpiar filtros mediante navegación", () => {
    expect(AuditDateFilter({ from: "2026-11-04" }).key).not.toBe(AuditDateFilter({}).key);
  });

  it("usa distribución compacta y foco visible sin transiciones innecesarias", () => {
    const html = renderToStaticMarkup(<AuditDateFilter />);
    expect(html).toContain("lg:grid-cols-[minmax(0,32rem)_auto]");
    expect(html).not.toContain("md:justify-between");
    expect(html).toContain("focus-visible:outline-[#A33116]");
    expect(html).toContain("motion-reduce:transition-none");
  });
});