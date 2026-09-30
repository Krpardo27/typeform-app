import { LuLoader } from "react-icons/lu";

type RandomSelectionControlsProps = {
  filteredCandidatesCount: number;
  isPending: boolean;
  isRandomizing: boolean;
  maxRandomWinnerCount: number;
  randomWinnerCount: string;
  reason: string;
  regionFilter: string;
  regionOptions: string[];
  safeRandomWinnerCount: number;
  onRandomWinnerCountChange: (count: string) => void;
  onReasonChange: (reason: string) => void;
  onRegionFilterChange: (region: string) => void;
  onSelectRandomWinners: () => void;
};

export function RandomSelectionControls({
  filteredCandidatesCount,
  isPending,
  isRandomizing,
  maxRandomWinnerCount,
  randomWinnerCount,
  reason,
  regionFilter,
  regionOptions,
  safeRandomWinnerCount,
  onRandomWinnerCountChange,
  onReasonChange,
  onRegionFilterChange,
  onSelectRandomWinners,
}: RandomSelectionControlsProps) {
  const controlsDisabled = isPending || isRandomizing;

  return (
    <aside className="min-w-0 rounded-xl border border-[#E8E8E6] bg-[#FBFBFA] p-4">
      <div className="space-y-3 border-b border-[#E8E8E6] pb-4">
        <p className="text-sm font-medium text-[#000000]">
          Selección aleatoria
        </p>

        <label className="block text-xs font-medium uppercase tracking-wider text-[#000000]/45">
          Región
        </label>

        <select
          value={regionFilter}
          onChange={(event) => onRegionFilterChange(event.target.value)}
          disabled={controlsDisabled || regionOptions.length === 0}
          className="w-full rounded-lg border border-[#DCDCD9] bg-white px-3 py-2.5 text-sm text-[#000000] outline-none transition focus:border-[#000000] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">Todas las regiones</option>
          {regionOptions.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>

        <label className="block text-xs font-medium uppercase tracking-wider text-[#000000]/45">
          Cantidad
        </label>

        <input
          type="number"
          min={1}
          max={maxRandomWinnerCount}
          value={randomWinnerCount === "" ? "" : String(safeRandomWinnerCount)}
          onChange={(event) => {
            const nextValue = event.target.value;

            if (nextValue === "") {
              onRandomWinnerCountChange("");
              return;
            }

            const nextCount = Number.parseInt(nextValue, 10);

            onRandomWinnerCountChange(
              String(Math.min(Math.max(1, nextCount), maxRandomWinnerCount)),
            );
          }}
          onBlur={() => {
            onRandomWinnerCountChange(String(safeRandomWinnerCount));
          }}
          disabled={controlsDisabled || filteredCandidatesCount === 0}
          className="w-full rounded-lg border border-[#DCDCD9] bg-white px-3 py-2.5 text-sm text-[#000000] outline-none transition focus:border-[#000000] disabled:cursor-not-allowed disabled:opacity-60"
        />

        <p className="text-xs leading-relaxed text-[#000000]/50">
          Máximo disponible con los filtros actuales: {filteredCandidatesCount}.
        </p>

        <button
          type="button"
          onClick={onSelectRandomWinners}
          disabled={controlsDisabled || filteredCandidatesCount === 0}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#D5B45D]/40 bg-[#D5B45D]/15 px-3 py-2.5 text-sm font-medium text-[#8A6A00] transition-colors hover:border-[#D5B45D]/60 hover:bg-[#D5B45D]/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRandomizing && <LuLoader className="size-4 animate-spin" />}
          {isRandomizing ? "Sorteando..." : "Elegir aleatorio"}
        </button>

        <p className="text-xs leading-relaxed text-[#000000]/50">
          El sorteo usa los participantes visibles con el filtro aplicado.
        </p>
      </div>

      <label
        htmlFor="winner-reason"
        className="mt-4 block text-sm font-medium text-[#000000]"
      >
        Motivo de selección
      </label>

      <input
        id="winner-reason"
        type="text"
        name="reason"
        value={reason}
        onChange={(event) => onReasonChange(event.target.value)}
        required
        disabled={isPending}
        className="mt-3 w-full rounded-lg border border-[#DCDCD9] bg-white px-3 py-2.5 text-sm text-[#000000] outline-none transition focus:border-[#000000] disabled:cursor-not-allowed disabled:opacity-60"
      />

      <p className="mt-3 text-xs leading-relaxed text-[#000000]/50">
        Este texto queda registrado junto a la selección de ganadores.
      </p>
    </aside>
  );
}
