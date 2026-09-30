import FormSubmit from "../../forms/FormSubmit";

type SelectionFooterProps = {
  canSubmitSelection: boolean;
  hasSelectionChanged: boolean;
  isPending: boolean;
  selectedCount: number;
  onClearSelection: () => void;
};

export function SelectionFooter({
  canSubmitSelection,
  hasSelectionChanged,
  isPending,
  selectedCount,
  onClearSelection,
}: SelectionFooterProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-[#E8E8E6] pt-4 md:flex-row md:items-center md:justify-between">
      <span className="text-xs text-[#000000]/50">
        {selectedCount === 0
          ? "Ningún participante seleccionado"
          : `${selectedCount} participante${
              selectedCount !== 1 ? "s" : ""
            } seleccionado${selectedCount !== 1 ? "s" : ""}`}
      </span>

      <div className="grid grid-cols-2 gap-2 md:flex md:items-center md:justify-end">
        <button
          type="button"
          disabled={isPending || selectedCount === 0}
          onClick={onClearSelection}
          className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-[#000000]/60 transition-colors hover:text-[#000000] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Limpiar selección
        </button>

        <FormSubmit
          value={
            isPending
              ? "Guardando..."
              : !canSubmitSelection
                ? "Sin cambios"
                : selectedCount === 0 && hasSelectionChanged
                  ? "Quitar ganadores"
                  : "Confirmar ganadores"
          }
          disabled={isPending || !canSubmitSelection}
          className="border border-[#00BFA5] bg-[#00BFA5] px-4 py-2 text-sm font-medium text-white transition-colors hover:border-[#00A88F] hover:bg-[#00A88F] disabled:cursor-not-allowed disabled:border-[#DCDCD9] disabled:bg-[#DCDCD9]"
        />
      </div>
    </div>
  );
}
