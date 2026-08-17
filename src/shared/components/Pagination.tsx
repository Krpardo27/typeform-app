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
}: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`);
  };

  const setPageSize = (nextPageSize: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(pageSizeParamName, String(nextPageSize));
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
    <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-center text-sm text-[#000000]/55 sm:text-left">
        Mostrando{" "}
        <span className="font-medium text-[#000000]">
          {from}-{to}
        </span>{" "}
        de <span className="font-medium text-[#000000]">{totalItems}</span>{" "}
        {itemLabel}
      </p>

      <div className="flex w-full flex-col items-center gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
        {showPageSizeSelector && (
          <label className="flex items-center gap-2 text-[#000000]/55 sm:text-xs">
            <span className="whitespace-nowrap">Por página</span>
            <select
              value={itemsPerPage}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className="cursor-pointer rounded-md border border-[#F5F5F5] bg-[#FFFFFF] px-2 py-1 text-[#000000] outline-none transition focus:border-[#FF5C35] sm:text-xs"
            >
              {pageSizeOptions.map((option) => (
                <option
                  key={option}
                  value={option}
                  className="bg-[#FFFFFF] text-[#000000]"
                >
                  {option}
                </option>
              ))}
            </select>
          </label>
        )}

        {hasMultiplePages && (
          <div className="flex flex-wrap items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Ir a la pagina anterior"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[#F5F5F5] bg-[#FFFFFF] text-[#000000]/60 transition-colors hover:border-[#000000]/20 hover:text-[#000000] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FiChevronLeft className="h-4 w-4" />
            </button>

            {getPageRange().map((page, index) =>
              page === "..." ? (
                <span key={`dots-${index}`} className="px-2 text-[#000000]/40">
                  ...
                </span>
              ) : (
                <button
                  type="button"
                  key={page}
                  onClick={() => goToPage(page)}
                  aria-current={currentPage === page ? "page" : undefined}
                  aria-label={`Ir a la pagina ${page}`}
                  className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                    currentPage === page
                      ? "border-[#FF5C35] bg-[#FF5C35]/10 text-[#FF5C35]"
                      : "border-[#F5F5F5] bg-[#FFFFFF] text-[#000000]/60 hover:border-[#000000]/20 hover:text-[#000000]"
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
              aria-label="Ir a la pagina siguiente"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#F5F5F5] bg-[#FFFFFF] text-[#000000]/60 transition-colors hover:border-[#000000]/20 hover:text-[#000000] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FiChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
