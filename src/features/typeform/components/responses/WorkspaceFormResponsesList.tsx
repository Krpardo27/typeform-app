"use client";

import { useId, useMemo, useState } from "react";
import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  globalFilteringFeature,
  filterFn_includesString,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { ResponseExportButton } from "@/features/typeform/components/responses/ResponseExportButton";
import { ResponseTableRow } from "@/features/typeform/components/responses/ResponseTableRow";
import type { MaskedTypeformResponse } from "@/features/typeform/services/typeform.service";

type WorkspaceFormResponsesListProps = {
  contactsByToken?: Record<string, string>;
  responses: MaskedTypeformResponse[];
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
  filteredRowModel: createFilteredRowModel(),
  filterFns: { includesString: filterFn_includesString },
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
    header: "Ganador",
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
  if (response.visibility !== "winner") {
    return [row.participantLabel, response.token, response.participantNumber].filter(Boolean).join(" ");
  }
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
  contactsByToken = {},
  responses,
  exportBaseHref,
  canExportResponses,
}: WorkspaceFormResponsesListProps) {
  const id = useId();
  const tableRows = useMemo<ResponseTableItem[]>(
    () => {
      const seen = new Set<string>();
      return responses.filter((response) => {
        if (response.visibility !== "winner" || seen.has(response.token)) return false;
        seen.add(response.token);
        return true;
      }).map((response, index) => ({
        response,
        participantLabel: `Ganador #${index + 1}`,
        contactOverride: contactsByToken[response.token],
        variant: "winner" as const,
      }));
    },
    [contactsByToken, responses],
  );

  const table = useTable({
    features: RESPONSE_TABLE_FEATURES,
    data: tableRows,
    columns: RESPONSE_TABLE_COLUMNS,
    getColumnCanGlobalFilter: (column) => column.id === "search",
    globalFilterFn: "includesString",
    getRowId: (row: ResponseTableItem) => row.response.token,
  });

  const visibleHeaders =
    table
      .getHeaderGroups()[0]
      ?.headers.filter((header) => header.id !== "search") ?? [];
  const visibleColumnCount = visibleHeaders.length;
  const filteredRows = table.getFilteredRowModel().rows;
  const searchValue = String(table.state.globalFilter ?? "");

  const responseTokens = useMemo(
    () => tableRows.filter((row) => row.response.visibility === "winner").map((row) => row.response.token),
    [tableRows],
  );

  const selectionKey = JSON.stringify(responseTokens);
  const [expansion, setExpansion] = useState(() => ({ key: selectionKey, tokens: responseTokens }));
  const expandedTokens = expansion.key === selectionKey ? expansion.tokens : responseTokens;

  function setExpandedTokens(update: (current: string[]) => string[]) {
    setExpansion((current) => ({
      key: selectionKey,
      tokens: update(current.key === selectionKey ? current.tokens : responseTokens),
    }));
  }

  const normalizedExpandedTokens = useMemo(
    () => filterUnavailableExpanded(expandedTokens, responseTokens),
    [expandedTokens, responseTokens],
  );

  const visibleTokens = filteredRows
    .filter((row) => row.original.response.visibility === "winner")
    .map((row) => row.original.response.token);
  const allExpanded =
    visibleTokens.length > 0 &&
    visibleTokens.every((token) => normalizedExpandedTokens.includes(token));
  const anyVisibleExpanded = visibleTokens.some((token) =>
    normalizedExpandedTokens.includes(token),
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
    setExpandedTokens((previous) => [
      ...new Set([
        ...filterUnavailableExpanded(previous, responseTokens),
        ...visibleTokens,
      ]),
    ]);
  }

  function collapseAll() {
    const visible = new Set(visibleTokens);
    setExpandedTokens((previous) =>
      filterUnavailableExpanded(previous, responseTokens).filter(
        (token) => !visible.has(token),
      ),
    );
  }

  function handleSearchChange(value: string) {
    table.setGlobalFilter(value || undefined);
  }

  return (
    <section aria-labelledby={`${id}-title`} className="mt-8 min-w-0 space-y-5">
      {tableRows.length === 0 ? (
        <div
          className="
            rounded-md
            border border-[#FF5C35]/30
            bg-white
            px-6 py-12
          "
        >
          <h2
            id={`${id}-title`}
            className="text-base font-medium text-[#171717]"
          >
            Datos de los ganadores
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#595954]">
            Confirma una selección de ganadores para consultar aquí sus datos y respuestas.
          </p>
        </div>
      ) : (
        <div className="min-w-0 overflow-hidden rounded-md border border-[#FF5C35]/35 bg-white text-[#171717]">
          <div className="flex flex-col gap-4 border-b border-[#FF5C35]/20 px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <h2 id={`${id}-title`} className="text-base font-semibold">
                Datos de los ganadores
              </h2>
              <p className="mt-2 text-sm leading-5 text-[#595954]">
                {tableRows.length} {tableRows.length === 1 ? "ganador confirmado" : "ganadores confirmados"}. Solo estos participantes tienen datos visibles.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="min-w-0 basis-full sm:min-w-56 sm:basis-auto sm:flex-1">
                <span className="sr-only">Buscar ganadores confirmados</span>
                <input
                  type="search"
                  value={searchValue}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Buscar ganadores confirmados"
                  className="min-h-11 w-full rounded-md border border-[#FF5C35]/35 bg-white px-3 py-2 text-sm text-[#171717] outline-none placeholder:text-[#767670] focus:border-[#FF5C35] focus:outline-2 focus:outline-offset-2 focus:outline-[#FF5C35]"
                />
              </label>

              {exportBaseHref && (
                <div>
                  <ResponseExportButton
                    baseHref={exportBaseHref}
                    scope="winners"
                    label="Exportar ganadores"
                    variant="winners"
                    canExport={canExportResponses}
                    disabledMessage={
                      "No tienes permisos para exportar"
                    }
                    disabledDescription={
                      "Solo los usuarios con rol editor pueden descargar respuestas."
                    }
                  />
                </div>
              )}

              <button
                type="button"
                onClick={expandAll}
                disabled={visibleTokens.length === 0 || allExpanded}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-[#FF5C35]/35 px-3 py-2 text-sm font-medium text-[#A53318] transition-colors hover:border-[#FF5C35] hover:bg-[#FFF1EC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
              >
                Expandir visibles
              </button>

              <button
                type="button"
                onClick={collapseAll}
                disabled={!anyVisibleExpanded}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-[#D1D1CD] px-3 py-2 text-sm font-medium text-[#595954] transition-colors hover:border-[#FF5C35]/60 hover:text-[#171717] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
              >
                Contraer visibles
              </button>
            </div>
          </div>

          <div
            role="region"
            aria-label="Tabla de datos de ganadores confirmados"
            tabIndex={0}
            className="relative overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#FF5C35]"
          >
            <table className="w-full min-w-200 border-collapse lg:min-w-225">
              <caption className="sr-only">
                Ganadores confirmados, contactos y respuestas del formulario
              </caption>
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
                          className="px-4 py-3 text-left text-sm font-medium text-[#595954] last:text-right"
                        >
                          {header.isPlaceholder ? null : header.column.id ===
                            "actions" ? (
                            <span className="sr-only">Expandir respuesta</span>
                          ) : (
                            <table.FlexRender header={header} />
                          )}
                        </th>
                      ))}
                  </tr>
                ))}
              </thead>

              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={visibleColumnCount}
                      className="px-4 py-8 text-center text-sm text-[#595954]"
                    >
                      No hay ganadores que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
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
            <p
              role="status"
              className="border-t border-[#E8E8E6] px-4 py-3 text-sm text-[#595954]"
            >
              {filteredRows.length} ganador(es) encontrados para “
              {searchValue}”.
            </p>
          )}

        </div>
      )}
    </section>
  );
}
