const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeAuditDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    ? value
    : undefined;
}

export function getAuditDateFilter(rawFrom?: unknown, rawTo?: unknown) {
  const from = normalizeAuditDate(rawFrom);
  const to = normalizeAuditDate(rawTo);
  const hasInvalidDate =
    (rawFrom !== undefined && rawFrom !== "" && !from) ||
    (rawTo !== undefined && rawTo !== "" && !to);
  const error = hasInvalidDate
    ? "Introduce fechas válidas para filtrar la actividad."
    : from && to && from > to
      ? "La fecha Desde no puede ser posterior a la fecha Hasta."
      : undefined;

  const createdAt = error || (!from && !to) ? undefined : {
    ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
    ...(to ? { lt: new Date(new Date(`${to}T00:00:00.000Z`).getTime() + DAY_MS) } : {}),
  };

  return { from, to, error, createdAt };
}

export function formatAuditDate(value: string) {
  const normalized = normalizeAuditDate(value);
  if (!normalized) return "";

  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${normalized}T00:00:00.000Z`));
}