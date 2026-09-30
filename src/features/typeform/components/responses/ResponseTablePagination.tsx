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

export function ResponseTablePagination({
  table,
}: {
  table: ResponseTablePaginationTable;
}) {
  const pageIndex = table.state.pagination.pageIndex;
  const pageSize = table.state.pagination.pageSize;
  const pageCount = table.getPageCount();
  const currentPage = pageIndex + 1;

  return (
    <div className="flex flex-col gap-3 border-t border-[#E8E8E6] bg-white px-3 py-3 text-xs text-[#000000]/60 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-medium text-[#111111]">{table.getRowCount()} filas</span>
        <span className="text-[#000000]/25">/</span>
        <span>
          Página {currentPage} de {pageCount}
        </span>
      </div>

      <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
        <select
          value={pageSize}
          onChange={(event) => table.setPageSize(Number(event.target.value))}
          className="h-9 w-full rounded-lg border border-[#E5E5E5] bg-white px-2 text-xs text-[#111111] outline-none transition-colors hover:border-black/20 focus:border-black/30 sm:h-8 sm:w-auto"
          aria-label="Filas por página de la tabla"
        >
          {PAGE_SIZE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option} filas
            </option>
          ))}
        </select>

        <div className="grid grid-cols-4 gap-1 sm:flex sm:items-center">
          <button
            type="button"
            onClick={() => table.firstPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Primera página"
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border border-[#E5E5E5] bg-white text-[#000000]/60 transition-colors hover:border-black/20 hover:text-black disabled:cursor-not-allowed disabled:opacity-40 sm:size-8"
          >
            <LuChevronsLeft className="size-3.5" />
          </button>

          <button
            type="button"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Página anterior"
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border border-[#E5E5E5] bg-white text-[#000000]/60 transition-colors hover:border-black/20 hover:text-black disabled:cursor-not-allowed disabled:opacity-40 sm:size-8"
          >
            <LuChevronLeft className="size-3.5" />
          </button>

          <button
            type="button"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Página siguiente"
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border border-[#E5E5E5] bg-white text-[#000000]/60 transition-colors hover:border-black/20 hover:text-black disabled:cursor-not-allowed disabled:opacity-40 sm:size-8"
          >
            <LuChevronRight className="size-3.5" />
          </button>

          <button
            type="button"
            onClick={() => table.lastPage()}
            disabled={!table.getCanLastPage()}
            aria-label="Última página"
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border border-[#E5E5E5] bg-white text-[#000000]/60 transition-colors hover:border-black/20 hover:text-black disabled:cursor-not-allowed disabled:opacity-40 sm:size-8"
          >
            <LuChevronsRight className="size-3.5" />
          </button>
        </div>

        <label className="flex items-center gap-2 text-[#000000]/50 sm:gap-1">
          Ir a
          <input
            type="number"
            min={1}
            max={Math.max(1, pageCount)}
            value={currentPage}
            onChange={(event) => {
              const nextPage = Number(event.target.value);
              table.setPageIndex(Math.max(0, nextPage - 1));
            }}
            className="h-9 min-w-0 flex-1 rounded-lg border border-[#E5E5E5] bg-white px-2 text-xs text-[#111111] outline-none transition-colors hover:border-black/20 focus:border-black/30 sm:h-8 sm:w-16 sm:flex-none"
          />
        </label>
      </div>
    </div>
  );
}