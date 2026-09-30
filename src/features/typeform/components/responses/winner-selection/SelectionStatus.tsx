type SelectionStatusProps = {
  hasSavedWinnerSelection: boolean;
  winnerSelection?: string;
  winnerError?: string;
};

export function SelectionStatus({
  hasSavedWinnerSelection,
  winnerSelection,
  winnerError,
}: SelectionStatusProps) {
  return (
    <>
      {winnerSelection === "1" && (
        <div
          className={`mx-3 mt-4 border-l-2 px-3 py-2.5 text-sm sm:mx-4 ${
            hasSavedWinnerSelection
              ? "border-[#00A88F] bg-[#F7FAF9] text-[#145C52]"
              : "border-[#B8B8B2] bg-[#FAFAF9] text-[#565650]"
          }`}
        >
          {hasSavedWinnerSelection ? (
            <>
              <span className="font-medium text-[#0F3F39]">
                Selección guardada.
              </span>{" "}
              Datos completos visibles solo para los ganadores.
            </>
          ) : (
            <>
              <span className="font-medium text-[#2F2F2C]">
                Selección actualizada.
              </span>{" "}
              No hay ganadores activos en este formulario.
            </>
          )}
        </div>
      )}

      {winnerError === "empty" && (
        <p className="mx-3 mt-4 rounded-lg border border-[#B45309]/20 bg-[#B45309]/6 px-3 py-2 text-sm text-[#B45309] sm:mx-4">
          Debes seleccionar al menos un participante para continuar.
        </p>
      )}

      {winnerError === "forbidden" && (
        <p className="mx-3 mt-4 rounded-lg border border-[#DC2626]/20 bg-[#DC2626]/6 px-3 py-2 text-sm text-[#DC2626] sm:mx-4">
          No tienes permisos para seleccionar ganadores en este formulario.
        </p>
      )}
    </>
  );
}
