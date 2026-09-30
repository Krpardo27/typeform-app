import Link from "next/link";

type AuditDateFilterProps = {
  from?: string;
  to?: string;
};

export function AuditDateFilter({ from, to }: AuditDateFilterProps) {
  const hasActiveFilter = Boolean(from || to);
  const activeFilterLabel = [
    from ? `Desde ${from}` : null,
    to ? `Hasta ${to}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <form
      action="/admin/auditoria"
      className="mt-6 rounded-xl border border-[#E5E5E5] bg-white p-4"
      method="get"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-[#737373]">
              Desde
            </span>
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="mt-1 min-h-10 w-full rounded-lg border border-[#DCDCD9] bg-white px-3 py-2 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-[#737373]">
              Hasta
            </span>
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="mt-1 min-h-10 w-full rounded-lg border border-[#DCDCD9] bg-white px-3 py-2 text-sm text-[#171717] outline-none transition focus:border-[#171717]"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasActiveFilter && (
            <Link
              href="/admin/auditoria"
              className="inline-flex min-h-10 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-[#525252] transition-colors hover:text-[#171717]"
            >
              Limpiar
            </Link>
          )}

          <button
            type="submit"
            className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-[#171717] bg-[#171717] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2A2A2A]"
          >
            Filtrar
          </button>
        </div>
      </div>

      {hasActiveFilter && (
        <p className="mt-3 text-xs text-[#737373]">
          Filtro activo: {activeFilterLabel}
        </p>
      )}
    </form>
  );
}
