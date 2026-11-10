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
    if (page < 1 || page > totalPages || page === currentPage) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`);
  };

  const selectedPageSizeValue =
    showAllPageSizeOption &&
    searchParams.get(pageSizeParamName)?.toLowerCase() === "all"
      ? "all"
      : String(itemsPerPage);

  const setPageSize = (nextPageSize: string) => {
    if (nextPageSize === selectedPageSizeValue) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set(pageSizeParamName, nextPageSize);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const from = (currentPage - 1) * itemsPerPage + 1;
  const to = Math.min(currentPage * itemsPerPage, totalItems);
  const hasMultiplePages = totalPages > 1;

  const getPageRange = () => {
    const delta = 1;
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
    <div className="flex w-full min-w-0 flex-col gap-3 border-t border-[#E5E5E5] pt-4 xl:flex-row xl:items-center xl:justify-between">
      <p className="min-w-0 text-sm leading-6 text-[#595954] wrap-anywhere">
        Mostrando{" "}
        <span className="font-medium whitespace-nowrap text-[#171717]">
          {from}–{to}
        </span>{" "}
        de <span className="font-medium text-[#171717]">{totalItems}</span>{" "}
        {itemLabel}
      </p>

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 sm:justify-end">
        {showPageSizeSelector && (
          <label className="flex min-h-11 max-w-full items-center gap-2 text-sm text-[#595954]">
            <span>Por página</span>
            <select
              value={selectedPageSizeValue}
              onChange={(event) => setPageSize(event.target.value)}
              className="min-h-11 min-w-18 cursor-pointer rounded-md border border-[#D8D8D4] bg-white px-2 font-medium text-[#171717] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A33116]"
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
            className="flex w-full min-w-0 flex-wrap items-center justify-between gap-1 sm:w-auto sm:justify-end"
          >
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              aria-label="Ir a la página anterior"
              className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md border border-[#E5E5E5] bg-white text-[#595954] transition-colors hover:bg-[#F7F7F6] hover:text-[#171717] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A33116] disabled:cursor-default disabled:opacity-35 motion-reduce:transition-none"
            >
              <FiChevronLeft aria-hidden="true" className="size-4" />
            </button>

            <span className="text-sm text-[#595954] sm:hidden">
              Página{" "}
              <span className="font-medium text-[#171717]">{currentPage}</span>{" "}
              de {totalPages}
            </span>

            <div className="hidden items-center gap-1 sm:flex">
              {getPageRange().map((page, index) =>
                page === "..." ? (
                  <span
                    key={`dots-${index}`}
                    aria-hidden="true"
                    className="flex h-11 w-6 items-center justify-center text-sm text-[#737373]"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    type="button"
                    key={page}
                    onClick={() => goToPage(page)}
                    aria-current={currentPage === page ? "page" : undefined}
                    aria-label={
                      currentPage === page
                        ? `Página ${page}, actual`
                        : `Ir a la página ${page}`
                    }
                    className={`flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md px-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A33116] motion-reduce:transition-none ${
                      currentPage === page
                        ? "bg-[#171717] font-medium text-white"
                        : "text-[#595954] hover:bg-[#F7F7F6] hover:text-[#171717]"
                    }`}
                  >
                    {page}
                  </button>
                ),
              )}
            </div>

            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              aria-label="Ir a la página siguiente"
              className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md border border-[#E5E5E5] bg-white text-[#595954] transition-colors hover:bg-[#F7F7F6] hover:text-[#171717] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A33116] disabled:cursor-default disabled:opacity-35 motion-reduce:transition-none"
            >
              <FiChevronRight aria-hidden="true" className="size-4" />
            </button>

            {showLastPageButton && (
              <button
                type="button"
                onClick={() => goToPage(totalPages)}
                disabled={currentPage >= totalPages}
                aria-label="Ir a la última página"
                className="min-h-11 cursor-pointer rounded-md px-3 text-sm font-medium text-[#595954] transition-colors hover:bg-[#F7F7F6] hover:text-[#171717] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A33116] disabled:cursor-default disabled:opacity-35 motion-reduce:transition-none"
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
