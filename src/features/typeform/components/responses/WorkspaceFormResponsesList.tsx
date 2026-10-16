"use client";

import { useMemo, useState } from "react";
import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  globalFilteringFeature,
  rowPaginationFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { ResponseExportButton } from "@/features/typeform/components/responses/ResponseExportButton";
import { ResponseTablePagination } from "@/features/typeform/components/responses/ResponseTablePagination";
import { ResponseTableRow } from "@/features/typeform/components/responses/ResponseTableRow";
import type { MaskedTypeformResponse } from "@/features/typeform/services/typeform.service";

type WorkspaceFormResponsesListProps = {
  highlightedResponses?: MaskedTypeformResponse[];
  highlightedContactsByToken?: Record<string, string>;
  responses: MaskedTypeformResponse[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  exportBaseHref?: string;
  canExportResponses: boolean;
};

type ResponseTableItem = {
  response: MaskedTypeformResponse;
  participantLabel: string;
  contactOverride?: string;
  variant?: "default" | "winner";
};

const RESPONSE_TABLE_FEATURES = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
});

const responseTableColumnHelper = createColumnHelper<
  typeof RESPONSE_TABLE_FEATURES,
  ResponseTableItem
>();

const RESPONSE_TABLE_COLUMNS = responseTableColumnHelper.columns([
  responseTableColumnHelper.accessor((row) => getResponseSearchText(row), {
    id: "search",
    header: "Buscar",
  }),
  responseTableColumnHelper.display({
    id: "participant",
    header: "Participante",
  }),
  responseTableColumnHelper.display({ id: "contact", header: "Contacto" }),
  responseTableColumnHelper.display({ id: "submittedAt", header: "Enviado" }),
  responseTableColumnHelper.display({ id: "answers", header: "Respuestas" }),
  responseTableColumnHelper.display({ id: "actions", header: "" }),
]);

function filterUnavailableExpanded(
  tokens: string[],
  availableTokens: string[],
): string[] {
  const available = new Set(availableTokens);

  return tokens.filter((token) => available.has(token));
}

function getResponseSearchText(row: ResponseTableItem) {
  const response = row.response;
  const values = [
    row.participantLabel,
    row.contactOverride,
    row.variant === "winner" ? "ganador ganador seleccionado" : null,
    response.token,
    response.participantNumber,
    response.submittedAt,
    response.landedAt,
    ...response.answers.flatMap((answer) => [
      answer.question,
      answer.value,
      answer.fieldType,
      answer.answerType,
    ]),
    ...response.hidden.flatMap((answer) => [answer.question, answer.value]),
  ];

  return values.filter(Boolean).join(" ");
}

export function WorkspaceFormResponsesList({
  highlightedResponses = [],
  highlightedContactsByToken = {},
  responses,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  exportBaseHref,
  canExportResponses,
}: WorkspaceFormResponsesListProps) {
  const safeCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
  const hasWinnerResponses = highlightedResponses.length > 0;

  const highlightedTokenSet = useMemo(
    () => new Set(highlightedResponses.map((response) => response.token)),
    [highlightedResponses],
  );
  const paginatedResponses = useMemo(
    () =>
      responses
        .map((response, index) => ({ response, index }))
        .filter(({ response }) => !highlightedTokenSet.has(response.token)),
    [highlightedTokenSet, responses],
  );

  const tableRows = useMemo<ResponseTableItem[]>(
    () => [
      ...highlightedResponses.map((response, index) => ({
        response,
        participantLabel: `Ganador #${index + 1}`,
        contactOverride: highlightedContactsByToken[response.token],
        variant: "winner" as const,
      })),
      ...paginatedResponses.map(({ response, index }) => ({
        response,
        participantLabel: `Participante #${
          response.participantNumber ??
          (safeCurrentPage - 1) * itemsPerPage + index + 1
        }`,
      })),
    ],
    [
      highlightedContactsByToken,
      highlightedResponses,
      itemsPerPage,
      paginatedResponses,
      safeCurrentPage,
    ],
  );

  const table = useTable({
    features: RESPONSE_TABLE_FEATURES,
    data: tableRows,
    columns: RESPONSE_TABLE_COLUMNS,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: Math.min(10, Math.max(1, tableRows.length)),
      },
    },
    getColumnCanGlobalFilter: (column) => column.id === "search",
    getRowId: (row: ResponseTableItem) => row.response.token,
  });

  const visibleHeaders = table
    .getHeaderGroups()[0]
    ?.headers.filter((header) => header.id !== "search") ?? [];
  const visibleColumnCount = visibleHeaders.length;
  const filteredRows = table.getFilteredRowModel().rows;
  const paginatedRows = table.getPaginatedRowModel().rows;
  const searchValue = String(table.state.globalFilter ?? "");

  const responseTokens = useMemo(
    () => filteredRows.map((row) => row.original.response.token),
    [filteredRows],
  );

  const [expandedTokens, setExpandedTokens] = useState<string[]>(
    highlightedResponses.length > 0
      ? highlightedResponses.map((response) => response.token)
      : responses[0]
        ? [responses[0].token]
        : [],
  );

  const normalizedExpandedTokens = useMemo(
    () => filterUnavailableExpanded(expandedTokens, responseTokens),
    [expandedTokens, responseTokens],
  );

  const allExpanded =
    paginatedResponses.length > 0 &&
    paginatedResponses.every(({ response }) =>
      normalizedExpandedTokens.includes(response.token),
    );

  function toggleToken(token: string) {
    setExpandedTokens((prev) => {
      const base = filterUnavailableExpanded(prev, responseTokens);

      return base.includes(token)
        ? base.filter((value) => value !== token)
        : [...base, token];
    });
  }

  function expandAll() {
    setExpandedTokens([
      ...highlightedResponses.map((response) => response.token),
      ...paginatedResponses.map(({ response }) => response.token),
    ]);
  }

  function collapseAll() {
    setExpandedTokens([]);
  }

  function handleSearchChange(value: string) {
    table.setPageIndex(0);
    table.setGlobalFilter(value || undefined);
  }

  return (
    <section className="mt-8 space-y-5">
      {responseTokens.length === 0 ? (
        <div
          className="
            rounded-2xl
            border border-dashed border-[#E8E8E6]
            bg-white
            px-6 py-12
            text-center
            shadow-[0_8px_30px_-18px_rgba(0,0,0,0.18)]
          "
        >
          <p className="text-sm font-medium text-[#000000]/80">
            No hay respuestas para esta página
          </p>

          <p className="mt-1 text-xs text-[#000000]/55">
            Ajusta la paginación o espera nuevas respuestas de Typeform.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#DADAD6] bg-white">
          <div className="flex flex-col gap-3 border-b border-[#E8E8E6] bg-white px-3 py-3 sm:px-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#111111]">
                Respuestas del formulario
              </p>
              <p className="mt-0.5 text-xs text-[#000000]/50">
                {totalItems} participantes en Typeform · {tableRows.length}{" "}
                filas cargadas
              </p>
            </div>

            <div className="grid gap-2 sm:flex sm:items-center">
              <label className="min-w-0 sm:w-64">
                <span className="sr-only">Buscar filas cargadas</span>
                <input
                  type="search"
                  value={searchValue}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Buscar filas cargadas"
                  className="min-h-10 w-full rounded-lg border border-[#DCDCD9] bg-white px-3 py-2 text-sm text-[#111111] outline-none transition placeholder:text-[#000000]/40 focus:border-[#111111] sm:min-h-8"
                />
              </label>

              {exportBaseHref && (
                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                  <ResponseExportButton
                    baseHref={exportBaseHref}
                    scope="participants"
                    label="Participantes"
                    variant="participants"
                    canExport={canExportResponses}
                  />

                  <ResponseExportButton
                    baseHref={exportBaseHref}
                    scope="winners"
                    label="Ganadores"
                    variant="winners"
                    canExport={canExportResponses && hasWinnerResponses}
                    disabledMessage={
                      canExportResponses
                        ? "No hay ganadores para exportar"
                        : "No tienes permisos para exportar"
                    }
                    disabledDescription={
                      canExportResponses
                        ? "Selecciona ganadores antes de descargar el archivo."
                        : "Solo los usuarios con rol editor pueden descargar respuestas."
                    }
                  />
                </div>
              )}

              <button
                type="button"
                onClick={expandAll}
                disabled={allExpanded}
                className="rounded-lg cursor-pointer border border-[#E8E8E6] bg-white px-3 py-2 text-xs font-medium text-[#000000]/70 transition-colors hover:border-black/20 hover:text-black disabled:cursor-not-allowed disabled:opacity-40 sm:py-1.5"
              >
                Expandir todo
              </button>

              <button
                type="button"
                onClick={collapseAll}
                disabled={normalizedExpandedTokens.length === 0}
                className="rounded-lg cursor-pointer border border-[#E8E8E6] bg-white px-3 py-2 text-xs font-medium text-[#000000]/70 transition-colors hover:border-black/20 hover:text-black disabled:cursor-not-allowed disabled:opacity-40 sm:py-1.5"
              >
                Contraer todo
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-200 border-collapse lg:min-w-225">
              <thead className="bg-[#FBFBFA]">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr
                    key={headerGroup.id}
                    className="border-b border-[#E8E8E6]"
                  >
                    {headerGroup.headers
                      .filter((header) => header.id !== "search")
                      .map((header) => (
                      <th
                        key={header.id}
                        scope="col"
                        className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#000000]/45 last:text-right"
                      >
                        {header.isPlaceholder ? null : (
                          <table.FlexRender header={header} />
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>

              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={visibleColumnCount}
                      className="px-4 py-10 text-center text-sm text-[#000000]/50"
                    >
                      No hay respuestas que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row) => (
                    <ResponseTableRow
                      key={row.id}
                      response={row.original.response}
                      isExpanded={normalizedExpandedTokens.includes(
                        row.original.response.token,
                      )}
                      participantLabel={row.original.participantLabel}
                      contactOverride={row.original.contactOverride}
                      variant={row.original.variant}
                      colSpan={visibleColumnCount}
                      onToggle={() => toggleToken(row.original.response.token)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {searchValue && (
            <p className="border-t border-[#E8E8E6] px-4 py-2 text-xs text-[#000000]/50">
              {filteredRows.length} fila(s) cargadas encontradas para “{searchValue}”.
            </p>
          )}

          <ResponseTablePagination table={table} />
        </div>
      )}
    </section>
  );
}
