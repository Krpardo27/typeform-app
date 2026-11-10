import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type SortFn,
} from "@tanstack/react-table";
import {
  LuArrowDown,
  LuArrowUp,
  LuChevronsUpDown,
  LuSearch,
} from "react-icons/lu";
import { useEffect, useId, useRef, useState } from "react";
import type { WinnerCandidate } from "./types";
import { getParticipantReference } from "./utils";

const WINNER_TABLE_FEATURES = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});

const winnerTableColumnHelper = createColumnHelper<
  typeof WINNER_TABLE_FEATURES,
  WinnerCandidate
>();

const collator = new Intl.Collator("es", {
  numeric: true,
  sensitivity: "base",
});
const sortVisibleText: SortFn<typeof WINNER_TABLE_FEATURES, WinnerCandidate> = (
  first,
  second,
  columnId,
) =>
  collator.compare(
    first.getValue<string>(columnId) ?? "",
    second.getValue<string>(columnId) ?? "",
  );

function visibleValue(value?: string) {
  return value?.trim() || undefined;
}

function candidateCity(candidate: WinnerCandidate) {
  return visibleValue(candidate.city) ?? visibleValue(candidate.comuna);
}

const SORT_COLUMN_LABELS = {
  detail: "Participante número",
  region: "Región",
  city: "Comuna",
} as const;

type SortableColumnId = keyof typeof SORT_COLUMN_LABELS;
type ColumnSort = { id: SortableColumnId; desc: boolean };

function isSortableColumnId(value: string): value is SortableColumnId {
  return Object.hasOwn(SORT_COLUMN_LABELS, value);
}

function sortingLabel(direction: false | "asc" | "desc") {
  return direction === "asc"
    ? "Orden ascendente"
    : direction === "desc"
      ? "Orden descendente"
      : "Sin orden";
}

const WINNER_TABLE_COLUMNS = winnerTableColumnHelper.columns([
  winnerTableColumnHelper.accessor(
    (candidate) => (candidate.selected ? 0 : 1),
    {
      id: "selected",
      header: "Elegir",
      sortFn: (first, second, columnId) =>
        first.getValue<number>(columnId) - second.getValue<number>(columnId),
    },
  ),
  winnerTableColumnHelper.accessor(
    (candidate) => getParticipantReference(candidate).match(/^#(\d+)$/)?.[1],
    {
      id: "detail",
      header: SORT_COLUMN_LABELS.detail,
      sortFn: sortVisibleText,
      sortUndefined: "last",
    },
  ),
  winnerTableColumnHelper.accessor(
    (candidate) => visibleValue(candidate.region),
    {
      id: "region",
      header: SORT_COLUMN_LABELS.region,
      sortFn: sortVisibleText,
      sortUndefined: "last",
    },
  ),
  winnerTableColumnHelper.accessor(
    candidateCity,
    {
      id: "city",
      header: SORT_COLUMN_LABELS.city,
      sortFn: sortVisibleText,
      sortUndefined: "last",
    },
  ),
  winnerTableColumnHelper.display({ id: "actions", header: "Acciones" }),
]);

type WinnerCandidatesTableProps = {
  candidates: WinnerCandidate[];
  isPending: boolean;
  query: string;
  selectedTokens: Set<string>;
  onCandidateChange: (token: string, checked: boolean) => void;
  onQueryChange: (query: string) => void;
  viewableTokens?: Set<string>;
  onViewCandidate?: (token: string) => void;
  /** Tokens confirmados completos, independientemente de los filtros. */
  confirmedSelectionKey?: string;
};

export function WinnerCandidatesTable({
  candidates,
  isPending,
  query,
  selectedTokens,
  onCandidateChange,
  onQueryChange,
  viewableTokens,
  onViewCandidate,
  confirmedSelectionKey,
}: WinnerCandidatesTableProps) {
  const id = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const [columnSort, setColumnSort] = useState<ColumnSort | null>(null);
  const activeColumnSort =
    columnSort && isSortableColumnId(columnSort.id)
      ? columnSort
      : null;
  const confirmedOrderKey = confirmedSelectionKey ?? JSON.stringify(
    candidates
      .filter((candidate) => candidate.selected)
      .map((candidate) => candidate.token)
      .sort(),
  );
  useEffect(() => {
    // Tras confirmar desde el final de la lista, mostrar el grupo de ganadores.
    // Editar solo las casillas del borrador no cambia esta clave ni el scroll.
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [confirmedOrderKey, activeColumnSort?.id, activeColumnSort?.desc]);
  const searchId = `${id}-search`;
  const captionId = `${id}-caption`;
  const orderDescriptionId = `${id}-order-description`;
  const orderDescription = activeColumnSort
    ? `Ganadores guardados primero. ${SORT_COLUMN_LABELS[activeColumnSort.id]} en orden ${activeColumnSort.desc ? "descendente" : "ascendente"} dentro de cada grupo.`
    : "Ganadores guardados primero. Sin orden de columna se conserva el orden original dentro de cada grupo.";
  const visibleSelectedCount = candidates.filter((candidate) =>
    selectedTokens.has(candidate.token),
  ).length;
  const winnerTable = useTable({
    features: WINNER_TABLE_FEATURES,
    data: candidates,
    columns: WINNER_TABLE_COLUMNS,
    state: {
      sorting: [
        { id: "selected", desc: false },
        ...(activeColumnSort ? [activeColumnSort] : []),
      ],
    },
    getRowId: (row: WinnerCandidate) => row.token,
  });

  return (
    <div className="min-w-0 space-y-3">
      <label
        htmlFor={searchId}
        className="block text-sm font-medium text-[#000000]"
      >
        Participantes
      </label>

      <div className="relative min-w-0">
        <LuSearch
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#000000]/35"
        />

        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar por número de participante, región o comuna"
          disabled={isPending}
          className="min-h-10 w-full min-w-0 rounded-md border border-[#DCDCD9] bg-white py-2.5 pl-10 pr-3 text-sm leading-5 text-[#000000] placeholder:text-[#000000]/40 outline-none transition focus-visible:border-[#C4513D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C4513D] disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      <div className="overflow-hidden rounded-md border border-[#E8E8E6] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-[#E8E8E6] bg-[#FBFBFA] px-3 py-2">
          <span role="status" aria-atomic="true" className="text-sm font-medium text-[#595954]">
            {candidates.length} participantes
          </span>

          <span className="text-sm text-[#595954]">
            {visibleSelectedCount} seleccionados visibles ·{" "}
            {selectedTokens.size} en total
          </span>
          <p id={orderDescriptionId} className="w-full text-xs leading-5 text-[#737373]">
            {orderDescription}
          </p>
        </div>

        <div
          ref={listRef}
          role="region"
          aria-label="Lista de participantes cargados del formulario"
          tabIndex={0}
          className="relative lg:max-h-88 overflow-auto rounded-md focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#C4513D]"
        >
          {candidates.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#000000]/50">
              No hay participantes que coincidan con los filtros actuales.
            </div>
          ) : (
            <table className="w-full min-w-140 border-collapse">
              <caption id={captionId} className="sr-only">
                Participantes cargados del formulario que coinciden con los
                filtros. Los ganadores guardados aparecen primero. Las cabeceras
                ordenan dentro de cada grupo; sin orden de columna se conserva
                el orden original. La selección manual fuera del filtro se
                conserva.
              </caption>
              <thead className="sticky top-0 z-10 bg-[#FBFBFA]">
                {winnerTable.getHeaderGroups().map((headerGroup) => (
                  <tr
                    key={headerGroup.id}
                    className="border-b border-[#E8E8E6]"
                  >
                    {headerGroup.headers.map((header) => {
                      const columnId = header.column.id;
                      const sortId = isSortableColumnId(columnId) && header.column.getCanSort()
                        ? columnId : null;
                      const direction = sortId ? header.column.getIsSorted() : false;
                      const SortIcon = direction === "asc" ? LuArrowUp
                        : direction === "desc" ? LuArrowDown : LuChevronsUpDown;

                      return (
                        <th
                          key={header.id}
                          scope="col"
                          aria-sort={direction ? "other" : undefined}
                          className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-[#595954] first:w-12"
                        >
                          {header.isPlaceholder ? null : sortId ? (
                              <button
                                type="button"
                                disabled={isPending}
                                aria-label={`Ordenar por ${SORT_COLUMN_LABELS[sortId]}. ${sortingLabel(direction)}`}
                                aria-describedby={orderDescriptionId}
                                onClick={() => {
                                  if (isPending) return;
                                  setColumnSort((current) =>
                                    current?.id !== sortId
                                      ? { id: sortId, desc: false }
                                      : current.desc
                                        ? null
                                        : { id: sortId, desc: true },
                                  );
                                }}
                                className={`-mx-1 inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-sm px-1 text-left text-[11px] font-semibold uppercase tracking-wider focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C4513D] disabled:cursor-not-allowed disabled:opacity-50 ${direction ? "text-[#A33116]" : "text-[#595954] hover:text-[#171717]"}`}
                              >
                                <winnerTable.FlexRender header={header} />
                                <SortIcon
                                  aria-hidden="true"
                                  className="size-3.5 shrink-0"
                                />
                              </button>
                          ) : <winnerTable.FlexRender header={header} />}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>

              <tbody>
                {winnerTable.getRowModel().rows.map((row) => {
                  const candidate = row.original;
                  const isSelected = selectedTokens.has(candidate.token);
                  const reference = getParticipantReference(candidate);
                  const participantLabel =
                    reference === "Participante"
                      ? "participante sin número"
                      : `participante ${reference}`;

                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-[#E8E8E6] transition-colors last:border-b-0 ${
                        isSelected
                          ? "bg-[#C4513D]/6"
                          : "bg-white hover:bg-[#FAFAF9]"
                      }`}
                    >
                      <td className="px-1 py-0 align-middle">
                        <label className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
                          <input
                            type="checkbox"
                            name="winnerToken"
                            value={candidate.token}
                            checked={isSelected}
                            disabled={
                              isPending ||
                              (candidate.missingResponse && !isSelected)
                            }
                            onChange={(event) => {
                              onCandidateChange(
                                candidate.token,
                                event.target.checked,
                              );
                            }}
                            className="size-4 cursor-pointer rounded-md accent-[#C4513D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C4513D] disabled:cursor-not-allowed"
                            aria-label={`${candidate.missingResponse ? "Retirar" : "Seleccionar"} ${participantLabel}`}
                          />
                        </label>
                      </td>

                      <td className="px-2 py-1 align-middle">
                        <span className="block text-sm font-medium tabular-nums text-[#111111]">
                          {reference}
                        </span>
                        {candidate.selected && (
                          <span className="block text-sm font-medium text-[#A33116]">
                            Ganador guardado
                          </span>
                        )}
                        {candidate.missingResponse && (
                          <span className="block text-sm text-[#595954]">
                            Respuesta no disponible
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1 align-middle text-sm text-[#595954] wrap-anywhere">
                        {candidate.region?.trim() || "-"}
                      </td>
                      <td className="px-2 py-1 align-middle text-sm text-[#595954] wrap-anywhere">
                        {candidateCity(candidate) ?? "-"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-0 align-middle text-sm">
                        <button
                          type="button"
                          disabled={
                            isPending ||
                            candidate.missingResponse ||
                            !viewableTokens?.has(candidate.token) ||
                            !onViewCandidate
                          }
                          onClick={() => {
                            if (!candidate.missingResponse)
                              onViewCandidate?.(candidate.token);
                          }}
                          aria-label={`Ver datos del ${participantLabel}`}
                          title={
                            candidate.missingResponse
                              ? "Respuesta no disponible"
                              : !viewableTokens?.has(candidate.token)
                                ? "Confirma a este participante como ganador para consultar sus datos completos."
                                : undefined
                          }
                          className="min-h-11 cursor-pointer rounded-sm px-1 text-left text-sm font-medium text-[#A33116] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A33116] disabled:cursor-not-allowed disabled:text-[#737373] disabled:no-underline disabled:opacity-60"
                        >
                          Ver Datos
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
