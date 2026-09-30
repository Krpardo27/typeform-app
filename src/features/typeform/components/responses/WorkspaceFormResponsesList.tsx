"use client";

import { useMemo, useState } from "react";
import {
  createColumnHelper,
  createPaginatedRowModel,
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
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
});

const responseTableColumnHelper = createColumnHelper<
  typeof RESPONSE_TABLE_FEATURES,
  ResponseTableItem
>();

const RESPONSE_TABLE_COLUMNS = responseTableColumnHelper.columns([
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
    getRowId: (row: ResponseTableItem) => row.response.token,
  });

  const columnCount = table.getAllLeafColumns().length;

  const responseTokens = useMemo(
    () => [
      ...highlightedResponses.map((response) => response.token),
      ...paginatedResponses.map(({ response }) => response.token),
    ],
    [highlightedResponses, paginatedResponses],
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
                    {headerGroup.headers.map((header) => (
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
                {table.getPaginatedRowModel().rows.map((row) => (
                  <ResponseTableRow
                    key={row.id}
                    response={row.original.response}
                    isExpanded={normalizedExpandedTokens.includes(
                      row.original.response.token,
                    )}
                    participantLabel={row.original.participantLabel}
                    contactOverride={row.original.contactOverride}
                    variant={row.original.variant}
                    colSpan={columnCount}
                    onToggle={() => toggleToken(row.original.response.token)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <ResponseTablePagination table={table} />
        </div>
      )}
    </section>
  );
}
