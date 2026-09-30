import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { LuSearch } from "react-icons/lu";
import type { WinnerCandidate } from "./types";

const WINNER_TABLE_FEATURES = tableFeatures({});

const winnerTableColumnHelper = createColumnHelper<
  typeof WINNER_TABLE_FEATURES,
  WinnerCandidate
>();

const WINNER_TABLE_COLUMNS = winnerTableColumnHelper.columns([
  winnerTableColumnHelper.display({ id: "selected", header: "" }),
  winnerTableColumnHelper.display({
    id: "participant",
    header: "Participante",
  }),
  winnerTableColumnHelper.display({ id: "detail", header: "Participante" }),
  winnerTableColumnHelper.display({ id: "email", header: "Email" }),
  winnerTableColumnHelper.display({ id: "region", header: "Región" }),
  winnerTableColumnHelper.display({ id: "comuna", header: "Comuna" }),
]);

type WinnerCandidatesTableProps = {
  candidates: WinnerCandidate[];
  isPending: boolean;
  query: string;
  selectedTokens: Set<string>;
  onCandidateChange: (token: string, checked: boolean) => void;
  onQueryChange: (query: string) => void;
};

export function WinnerCandidatesTable({
  candidates,
  isPending,
  query,
  selectedTokens,
  onCandidateChange,
  onQueryChange,
}: WinnerCandidatesTableProps) {
  const winnerTable = useTable({
    features: WINNER_TABLE_FEATURES,
    data: candidates,
    columns: WINNER_TABLE_COLUMNS,
    getRowId: (row: WinnerCandidate) => row.token,
  });

  return (
    <div className="min-w-0 space-y-3">
      <label
        htmlFor="winner-search"
        className="block text-sm font-medium text-[#000000]"
      >
        Participantes
      </label>

      <div className="relative min-w-0">
        <LuSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#000000]/35" />

        <input
          id="winner-search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar por nombre o número de participante"
          disabled={isPending}
          className="min-h-10 w-full min-w-0 rounded-lg border border-[#DCDCD9] bg-white py-2.5 pl-10 pr-3 text-sm leading-5 text-[#000000] placeholder:text-[#000000]/40 outline-none transition focus:border-[#000000] disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-[#E8E8E6] bg-white">
        <div className="flex items-center justify-between border-b border-[#E8E8E6] bg-[#FBFBFA] px-3 py-2">
          <span className="text-xs font-medium text-[#000000]/50">
            {candidates.length} participantes
          </span>

          <span className="text-xs text-[#000000]/40">
            {selectedTokens.size} seleccionados
          </span>
        </div>

        <div className="max-h-88 overflow-auto">
          {candidates.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#000000]/50">
              No hay participantes que coincidan con tu búsqueda.
            </div>
          ) : (
            <table className="w-full min-w-120 border-collapse sm:min-w-140">
              <thead className="sticky top-0 z-10 bg-[#FBFBFA]">
                {winnerTable.getHeaderGroups().map((headerGroup) => (
                  <tr
                    key={headerGroup.id}
                    className="border-b border-[#E8E8E6]"
                  >
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        scope="col"
                        className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-[#000000]/45 first:w-10"
                      >
                        {header.isPlaceholder ? null : (
                          <winnerTable.FlexRender header={header} />
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>

              <tbody>
                {winnerTable.getRowModel().rows.map((row) => {
                  const candidate = row.original;
                  const isSelected = selectedTokens.has(candidate.token);

                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-[#E8E8E6] transition-colors last:border-b-0 ${
                        isSelected
                          ? "bg-[#F7F7F6]"
                          : "bg-white hover:bg-[#FAFAF9]"
                      }`}
                    >
                      <td className="px-3 py-2.5 align-middle">
                        <input
                          type="checkbox"
                          name="winnerToken"
                          value={candidate.token}
                          checked={isSelected}
                          disabled={isPending}
                          onChange={(event) => {
                            onCandidateChange(
                              candidate.token,
                              event.target.checked,
                            );
                          }}
                          className="size-4 cursor-pointer accent-[#111111] disabled:cursor-not-allowed"
                          aria-label={`Seleccionar ${candidate.label}`}
                        />
                      </td>

                      <td className="px-3 py-2.5 align-middle">
                        <span className="block truncate text-sm font-medium text-[#111111]">
                          {candidate.label}
                        </span>
                      </td>

                      <td className="px-3 py-2.5 align-middle text-xs text-[#000000]/45">
                        {candidate.detail ?? "-"}
                      </td>
                      <td className="px-3 py-2.5 align-middle text-xs text-[#000000]/45">
                        {candidate.email ?? "-"}
                      </td>

                      <td className="px-3 py-2.5 align-middle text-xs text-[#000000]/45">
                        {candidate.region ?? "-"}
                      </td>
                      <td className="px-3 py-2.5 align-middle text-xs text-[#000000]/45">
                        {candidate.comuna ?? "-"}
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
