import { useId } from "react";
import { getSafeRandomWinnerCount } from "./utils";

type RandomSelectionControlsProps = {
  filteredCandidatesCount: number;
  isPending: boolean;
  isRandomCooldown?: boolean;
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
  isRandomCooldown = false,
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
  const controlsDisabled = isPending;
  const id = useId();
  const regionId = `${id}-region`;
  const countId = `${id}-count`;
  const reasonId = `${id}-reason`;
  const countHintId = `${id}-count-hint`;
  const reasonHintId = `${id}-reason-hint`;
  const scopeHintId = `${id}-scope-hint`;
  const inputClassName =
    "min-h-11 w-full min-w-0 rounded-md border border-[#DCDCD9] bg-white px-3 py-2 text-sm text-[#000000] outline-none transition focus-visible:border-[#C4513D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C4513D] disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <aside className="min-w-0 space-y-4 rounded-md border border-[#E8E8E6] bg-[#FBFBFA] p-4">
      <div className="min-w-0 space-y-3">
        <label
          htmlFor={regionId}
          className="block text-sm font-medium text-[#000000]"
        >
          Región
        </label>

        <select
          id={regionId}
          aria-describedby={scopeHintId}
          value={regionFilter}
          onChange={(event) => onRegionFilterChange(event.target.value)}
          disabled={controlsDisabled || regionOptions.length === 0}
          className={inputClassName}
        >
          <option value="">Todas las regiones</option>
          {regionOptions.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>

        <p className="text-sm leading-5 text-[#000000]/60">
          Filtra tabla y sorteo. La selección fuera del filtro se conserva.
        </p>

        <p className="border-t border-[#E8E8E6] pt-3 text-sm font-medium text-[#000000]">
          Selección aleatoria
        </p>

        <label
          htmlFor={countId}
          className="block text-sm font-medium text-[#000000]"
        >
          Cantidad
        </label>

        <input
          id={countId}
          aria-describedby={countHintId}
          type="number"
          min={1}
          max={maxRandomWinnerCount}
          step={1}
          value={randomWinnerCount}
          onChange={(event) => {
            const nextValue = event.target.value;

            if (nextValue === "") {
              onRandomWinnerCountChange("");
              return;
            }

            const nextCount = Number(nextValue);
            if (!Number.isFinite(nextCount) || !Number.isInteger(nextCount))
              return;
            onRandomWinnerCountChange(
              String(getSafeRandomWinnerCount(nextValue, maxRandomWinnerCount)),
            );
          }}
          onBlur={() => {
            onRandomWinnerCountChange(String(safeRandomWinnerCount));
          }}
          disabled={controlsDisabled || filteredCandidatesCount === 0}
          className={inputClassName}
        />

        <p id={countHintId} className="text-sm leading-5 text-[#000000]/60">
          Disponibles: {filteredCandidatesCount}. Se sortearán{" "}
          {filteredCandidatesCount === 0 ? 0 : safeRandomWinnerCount}{" "}
          participantes.
        </p>

        <button
          type="button"
          onClick={onSelectRandomWinners}
          aria-describedby={scopeHintId}
          disabled={
            controlsDisabled ||
            isRandomCooldown ||
            filteredCandidatesCount === 0
          }
          className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-md border border-[#C4513D]/40 bg-[#C4513D]/8 px-3 py-2 text-sm font-medium text-[#A43E2D] transition-colors hover:bg-[#C4513D]/12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C4513D] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRandomCooldown
            ? "Sorteo realizado"
            : "Sortear y reemplazar selección"}
        </button>

        <p id={scopeHintId} className="text-sm leading-5 text-[#000000]/60">
          Sortea entre los participantes cargados según búsqueda y región.
          Reemplaza toda la selección, incluidos los seleccionados fuera del
          filtro.
        </p>
      </div>

      <div className="min-w-0 space-y-3">
        <label
          htmlFor={reasonId}
          className="block text-sm font-medium text-[#000000]"
        >
          Motivo de selección
        </label>

        <input
          id={reasonId}
          aria-describedby={reasonHintId}
          type="text"
          name="reason"
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          required
          disabled={controlsDisabled}
          className={inputClassName}
        />

        <p id={reasonHintId} className="text-sm leading-5 text-[#000000]/60">
          Queda registrado con los ganadores.
        </p>
      </div>
    </aside>
  );
}
