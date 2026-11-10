import Link from "next/link";
import { formatAuditDate } from "../utils/audit-date-range";

type AuditDateFilterProps = {
  from?: string;
  to?: string;
  error?: string;
};

export function AuditDateFilter({ from, to, error }: AuditDateFilterProps) {
  const hasActiveFilter = Boolean(from || to);
  const activeFilterLabel = [
    from ? `Desde ${formatAuditDate(from)}` : null,
    to ? `Hasta ${formatAuditDate(to)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const inputClassName =
    "mt-1.5 min-h-11 w-full min-w-0 rounded-md border border-[#D1D1CD] bg-white px-3 py-2 text-sm text-[#171717] transition-colors focus:border-[#A33116] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A33116] aria-invalid:border-[#B42318] motion-reduce:transition-none";

  return (
    <form
      key={`${from ?? ""}:${to ?? ""}:${error ?? ""}`}
      action="/admin/auditoria"
      aria-label="Filtrar actividad por fecha"
      aria-describedby="audit-date-hint"
      className="mt-6 rounded-lg border border-[#E5E5E5] bg-white p-4 sm:p-5"
      method="get"
    >
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,32rem)_auto] lg:items-end lg:justify-start">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <label className="block min-w-0">
            <span className="text-sm font-medium text-[#595954]">Desde</span>
            <input
              type="date"
              name="from"
              defaultValue={from}
              aria-invalid={Boolean(error)}
              aria-describedby={
                error ? "audit-date-hint audit-date-error" : "audit-date-hint"
              }
              className={inputClassName}
            />
          </label>

          <label className="block min-w-0">
            <span className="text-sm font-medium text-[#595954]">Hasta</span>
            <input
              type="date"
              name="to"
              defaultValue={to}
              aria-invalid={Boolean(error)}
              aria-describedby={
                error ? "audit-date-hint audit-date-error" : "audit-date-hint"
              }
              className={inputClassName}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(hasActiveFilter || error) && (
            <Link
              href="/admin/auditoria"
              className="inline-flex min-h-11 items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-[#595954] underline-offset-4 transition-colors hover:text-[#171717] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A33116] motion-reduce:transition-none"
            >
              Limpiar
            </Link>
          )}

          <button
            type="submit"
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-[#171717] bg-[#171717] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2A2A2A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A33116] motion-reduce:transition-none"
          >
            Filtrar
          </button>
        </div>
      </div>

      <p id="audit-date-hint" className="mt-3 text-sm leading-5 text-[#737373]">
        Fechas en UTC. Puedes indicar solo una fecha; el rango incluye ambos
        días.
      </p>
      {error && (
        <p
          id="audit-date-error"
          role="alert"
          className="mt-2 text-sm leading-5 text-[#9B231B]"
        >
          {error}
        </p>
      )}
      {hasActiveFilter && !error && (
        <p className="mt-2 text-sm leading-5 text-[#595954]">
          Filtro activo: {activeFilterLabel}
        </p>
      )}
    </form>
  );
}
