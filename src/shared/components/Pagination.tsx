"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  itemLabel?: string;
  showPageSizeSelector?: boolean;
  pageSizeOptions?: number[];
  pageSizeParamName?: string;
  showAllPageSizeOption?: boolean;
  allPageSizeLabel?: string;
  showLastPageButton?: boolean;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  itemLabel = "items",
  showPageSizeSelector = false,
  pageSizeOptions = [10, 20, 50, 100],
  pageSizeParamName = "pageSize",
  showAllPageSizeOption = false,
  allPageSizeLabel = "Todos",
  showLastPageButton = false,
}: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`);
  };

  const selectedPageSizeValue =
    searchParams.get(pageSizeParamName) === "all"
      ? "all"
      : String(itemsPerPage);

  const setPageSize = (nextPageSize: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(pageSizeParamName, nextPageSize);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const from = (currentPage - 1) * itemsPerPage + 1;
  const to = Math.min(currentPage * itemsPerPage, totalItems);
  const hasMultiplePages = totalPages > 1;

  const getPageRange = () => {
    const delta = 2;
    const range: (number | "...")[] = [];
    const left = Math.max(2, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);

    range.push(1);

    if (left > 2) {
      range.push("...");
    }

    for (let page = left; page <= right; page++) {
      range.push(page);
    }

    if (right < totalPages - 1) {
      range.push("...");
    }

    if (totalPages > 1) {
      range.push(totalPages);
    }

    return range;
  };

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-3 border-t border-[#E5E5E5] pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm text-[#171717]/55">
        <span>Mostrando</span>
        <span className="font-medium text-[#171717]">{from}-{to}</span>
        <span>de</span>
        <span className="font-medium text-[#171717]">{totalItems}</span>
        <span>{itemLabel}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {showPageSizeSelector && (
          <label className="flex items-center gap-2 rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#171717]/60">
            <span>Mostrar</span>
            <select
              value={selectedPageSizeValue}
              onChange={(event) => setPageSize(event.target.value)}
              className="bg-transparent font-medium text-[#171717] outline-none"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}

              {showAllPageSizeOption && (
                <option value="all">{allPageSizeLabel}</option>
              )}
            </select>
          </label>
        )}

        {hasMultiplePages && (
          <nav
            aria-label="Paginación"
            className="inline-flex items-center overflow-hidden rounded-md border border-[#E5E5E5] bg-white"
          >
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Ir a la página anterior"
              className="flex h-9 w-9 items-center justify-center border-r border-[#E5E5E5] text-[#171717]/55 transition-colors hover:bg-[#F7F7F6] hover:text-[#171717] disabled:pointer-events-none disabled:opacity-30"
            >
              <FiChevronLeft className="h-4 w-4" />
            </button>

            {getPageRange().map((page, index) =>
              page === "..." ? (
                <span
                  key={`dots-${index}`}
                  className="flex h-9 w-9 items-center justify-center border-r border-[#E5E5E5] text-sm text-[#171717]/35"
                >
                  ...
                </span>
              ) : (
                <button
                  type="button"
                  key={page}
                  onClick={() => goToPage(page)}
                  aria-current={currentPage === page ? "page" : undefined}
                  aria-label={`Ir a la página ${page}`}
                  className={`flex h-9 min-w-9 cursor-pointer items-center justify-center border-r border-[#E5E5E5] px-3 text-sm transition-colors ${
                    currentPage === page
                      ? "bg-[#171717] font-medium text-white"
                      : "text-[#171717]/60 hover:bg-[#F7F7F6] hover:text-[#171717]"
                  }`}
                >
                  {page}
                </button>
              ),
            )}

            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Ir a la página siguiente"
              className="flex h-9 w-9 items-center justify-center text-[#171717]/55 transition-colors hover:bg-[#F7F7F6] hover:text-[#171717] disabled:pointer-events-none disabled:opacity-30"
            >
              <FiChevronRight className="h-4 w-4" />
            </button>

            {showLastPageButton && (
              <button
                type="button"
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                className="border-l border-[#E5E5E5] px-3 text-xs font-medium text-[#171717]/60 transition-colors hover:bg-[#F7F7F6] hover:text-[#171717] disabled:pointer-events-none disabled:opacity-30"
              >
                Última
              </button>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
