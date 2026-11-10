import {
  LuChevronLeft,
  LuChevronRight,
  LuChevronsLeft,
  LuChevronsRight,
} from "react-icons/lu";

type ResponseTablePaginationTable = {
  state: {
    pagination: {
      pageIndex: number;
      pageSize: number;
    };
  };
  firstPage: () => void;
  previousPage: () => void;
  nextPage: () => void;
  lastPage: () => void;
  getCanPreviousPage: () => boolean;
  getCanNextPage: () => boolean;
  getCanLastPage: () => boolean;
  getPageCount: () => number;
  getRowCount: () => number;
  setPageIndex: (pageIndex: number) => void;
  setPageSize: (pageSize: number) => void;
};

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const navigationButtonClass = "inline-flex h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-md border border-[#E5E5E5] bg-white text-[#595954] transition-colors hover:border-[#B8B8B2] hover:text-[#171717] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A33116] disabled:cursor-default disabled:opacity-40 motion-reduce:transition-none";

export function ResponseTablePagination({
  table,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  showAllPageSizeOption = false,
  itemLabel = "filas",
  pageSizeLabel = "Filas por página de la tabla",
  isPending = false,
}: {
  table: ResponseTablePaginationTable;
  pageSizeOptions?: number[];
  showAllPageSizeOption?: boolean;
  itemLabel?: string;
  pageSizeLabel?: string;
  isPending?: boolean;
}) {
  const pageIndex = table.state.pagination.pageIndex;
  const pageSize = table.state.pagination.pageSize;
  const pageCount = table.getPageCount();
  const currentPage = pageIndex + 1;

  return (
    <nav aria-label="Paginación" aria-busy={isPending} className="flex min-w-0 flex-col gap-3 border-t border-[#E8E8E6] bg-white px-3 py-3 text-sm text-[#595954] sm:px-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-medium text-[#171717]">{table.getRowCount()} {itemLabel}</span>
        <span aria-hidden="true" className="text-[#737373]">/</span>
        <span>
          Página {currentPage} de {pageCount}
        </span>
      </div>

      <div className="grid min-w-0 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <select
          value={pageSize === Infinity ? "all" : pageSize}
          onChange={(event) => table.setPageSize(event.target.value === "all" ? Infinity : Number(event.target.value))}
          disabled={isPending}
          className="min-h-11 w-full min-w-0 max-w-full cursor-pointer rounded-md border border-[#E5E5E5] bg-white px-2 text-sm text-[#171717] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A33116] disabled:cursor-default disabled:opacity-40 sm:w-auto"
          aria-label={pageSizeLabel}
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option} {itemLabel}
            </option>
          ))}
          {showAllPageSizeOption && <option value="all">Todos</option>}
        </select>

        <div className="grid grid-cols-4 gap-2 sm:flex sm:items-center sm:gap-1">
          <button
            type="button"
            onClick={() => table.firstPage()}
            disabled={isPending || !table.getCanPreviousPage()}
            aria-label="Primera página"
            className={navigationButtonClass}
          >
            <LuChevronsLeft aria-hidden="true" className="size-6 text-[#FF5C35]" />
          </button>

          <button
            type="button"
            onClick={() => table.previousPage()}
            disabled={isPending || !table.getCanPreviousPage()}
            aria-label="Página anterior"
            className={navigationButtonClass}
          >
            <LuChevronLeft aria-hidden="true" className="size-6 text-[#FF5C35]" />
          </button>

          <button
            type="button"
            onClick={() => table.nextPage()}
            disabled={isPending || !table.getCanNextPage()}
            aria-label="Página siguiente"
            className={navigationButtonClass}
          >
            <LuChevronRight aria-hidden="true" className="size-6 text-[#FF5C35]" />
          </button>

          <button
            type="button"
            onClick={() => table.lastPage()}
            disabled={isPending || !table.getCanLastPage()}
            aria-label="Última página"
            className={navigationButtonClass}
          >
            <LuChevronsRight aria-hidden="true" className="size-6 text-[#FF5C35]" />
          </button>
        </div>

        <form
          key={`${currentPage}-${pageCount}`}
          className="flex w-full min-w-0 items-center gap-2 sm:w-auto"
          onSubmit={(event) => {
            event.preventDefault();
            if (isPending) return;
            const nextPage = Number(new FormData(event.currentTarget).get("page"));
            if (!Number.isSafeInteger(nextPage) || nextPage < 1 || nextPage > pageCount) return;
            if (nextPage !== currentPage) table.setPageIndex(nextPage - 1);
          }}
        >
          <label className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
            <span className="shrink-0">Ir a</span>
            <input
              name="page"
              type="number"
              min={1}
              max={Math.max(1, pageCount)}
              defaultValue={currentPage}
              disabled={isPending || pageCount <= 1}
              required
              className="min-h-11 w-full min-w-0 rounded-md border border-[#E5E5E5] bg-white px-2 text-sm text-[#171717] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A33116] disabled:opacity-40 sm:w-16"
            />
          </label>
          <button type="submit" disabled={isPending || pageCount <= 1} className={navigationButtonClass}>Ir</button>
        </form>
      </div>
      {isPending && <span role="status">Cargando participantes…</span>}
    </nav>
  );
}