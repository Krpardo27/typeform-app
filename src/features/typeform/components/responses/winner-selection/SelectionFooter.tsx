type SelectionFooterProps = {
  canSubmitSelection: boolean;
  hasSelectionChanged: boolean;
  isPending: boolean;
  isConfirming?: boolean;
  selectedCount: number;
  hiddenSelectedCount: number;
  disabledReason?: string;
  onClearSelection: () => void;
};

export function SelectionFooter({
  canSubmitSelection,
  hasSelectionChanged,
  isPending,
  isConfirming,
  selectedCount,
  hiddenSelectedCount,
  disabledReason,
  onClearSelection,
}: SelectionFooterProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-[#E8E8E6] pt-4 md:flex-row md:items-center md:justify-between">
      <span className="text-sm text-[#000000]/50">
        {selectedCount === 0
          ? "Ningún participante seleccionado"
          : `${selectedCount} participante${
              selectedCount !== 1 ? "s" : ""
            } seleccionado${selectedCount !== 1 ? "s" : ""}`}
          {` · ${hiddenSelectedCount} fuera del filtro`}
          <span className="mt-1 block">{disabledReason ?? "La selección manual fuera del filtro también se guardará."}</span>
          {!hasSelectionChanged && <span className="mt-1 block">Sin cambios pendientes.</span>}
      </span>

      <div className="grid grid-cols-2 gap-2 md:flex md:items-center md:justify-end">
        <button
          type="button"
          disabled={isPending || selectedCount === 0}
          onClick={onClearSelection}
          className="cursor-pointer rounded-md px-3 py-2 text-sm font-medium text-[#000000]/60 transition-colors hover:text-[#000000] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C4513D] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Limpiar selección
        </button>

        <button
          type="submit"
          disabled={isPending || !canSubmitSelection}
          title={!canSubmitSelection ? disabledReason ?? "No hay cambios pendientes de confirmación." : undefined}
          className="cursor-pointer rounded-md border border-[#C4513D] bg-[#C4513D] px-4 py-2 text-sm font-medium text-white transition-colors hover:border-[#A43E2D] hover:bg-[#A43E2D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C4513D] disabled:cursor-not-allowed disabled:border-[#DCDCD9] disabled:bg-[#DCDCD9] disabled:text-[#454541]"
        >
          {isConfirming
              ? "Confirmando..."
              : isPending
              ? "Guardando..."
              : selectedCount === 0 && hasSelectionChanged
                  ? "Quitar ganadores"
                  : "Confirmar ganadores"
          }
        </button>
      </div>
    </div>
  );
}
