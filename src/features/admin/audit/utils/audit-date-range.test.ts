import { describe, expect, it } from "vitest";
import { formatAuditDate, getAuditDateFilter, normalizeAuditDate } from "./audit-date-range";

describe("normalizeAuditDate", () => {
  it.each(["2026-11-04", "2024-02-29", "2000-02-29"])("acepta una fecha real %s", (value) => {
    expect(normalizeAuditDate(value)).toBe(value);
  });

  it.each([
    undefined, null, "", "2026-02-29", "2026-02-31", "1900-02-29", "2026-13-01",
    "2026-00-01", "2026-11-00", "2026-11-31", "0000-01-01", "2026-1-1", " 2026-11-04",
    "2026-11-04T00:00:00Z", ["2026-11-04"], 2026,
  ])("rechaza fechas inexistentes, formatos incorrectos y arrays: %j", (value) => {
    expect(normalizeAuditDate(value)).toBeUndefined();
  });
});

describe("getAuditDateFilter", () => {
  it("sin fechas no aplica restricciones", () => {
    expect(getAuditDateFilter()).toEqual({ from: undefined, to: undefined, error: undefined, createdAt: undefined });
    expect(getAuditDateFilter("", "").createdAt).toBeUndefined();
  });

  it("incluye todo el día final en UTC mediante un límite exclusivo", () => {
    const filter = getAuditDateFilter("2026-11-01", "2026-11-04");
    expect(filter.error).toBeUndefined();
    expect(filter.createdAt).toEqual({
      gte: new Date("2026-11-01T00:00:00Z"), lt: new Date("2026-11-05T00:00:00Z"),
    });
  });

  it("admite el mismo día de inicio y fin", () => {
    expect(getAuditDateFilter("2026-11-04", "2026-11-04").error).toBeUndefined();
  });

  it("admite filtros abiertos por un extremo", () => {
    expect(getAuditDateFilter("2026-11-04").createdAt).toEqual({ gte: new Date("2026-11-04T00:00:00Z") });
    expect(getAuditDateFilter(undefined, "2026-11-04").createdAt).toEqual({ lt: new Date("2026-11-05T00:00:00Z") });
  });

  it("informa el rango invertido sin generar una consulta de fechas", () => {
    const filter = getAuditDateFilter("2026-11-05", "2026-11-04");
    expect(filter.error).toContain("no puede ser posterior");
    expect(filter.createdAt).toBeUndefined();
    expect(filter.from).toBe("2026-11-05");
  });

  it.each(["2026-02-31", ["2026-11-01", "2026-11-04"]])("no ignora silenciosamente un parámetro inválido: %j", (value) => {
    expect(getAuditDateFilter(value).error).toContain("fechas válidas");
    expect(getAuditDateFilter(undefined, value).createdAt).toBeUndefined();
  });
});

describe("formatAuditDate", () => {
  it("presenta el día en formato local sin cambiar el huso UTC", () => {
    expect(formatAuditDate("2026-11-04")).toBe(new Intl.DateTimeFormat("es-CL", {
      day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
    }).format(new Date("2026-11-04T00:00:00Z")));
    expect(formatAuditDate("2026-02-31")).toBe("");
  });
});