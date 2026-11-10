type SelectionStatusProps = {
  hasSavedWinnerSelection: boolean;
  winnerSelection?: string;
  winnerError?: string;
  feedback?: string;
  selectionNotice?: string;
};

export function SelectionStatus({
  hasSavedWinnerSelection,
  winnerSelection,
  winnerError,
  feedback,
  selectionNotice,
}: SelectionStatusProps) {
  return (
    <>
      {selectionNotice && (
        <p role="status" className="mx-3 mt-4 rounded-md border border-[#E8E8E6] bg-[#FAFAF9] px-3 py-2 text-sm text-[#454541] sm:mx-4">
          {selectionNotice}
        </p>
      )}
      {feedback && (
        <p role="alert" className="mx-3 mt-4 rounded-md border border-[#C4513D]/30 bg-[#C4513D]/6 px-3 py-2 text-sm text-[#A43E2D] sm:mx-4">
          {feedback}
        </p>
      )}
      {winnerSelection === "1" && (
        <div
          role="status"
          className={`mx-3 mt-4 rounded-md border-l-2 px-3 py-2.5 text-sm sm:mx-4 ${
            hasSavedWinnerSelection
              ? "border-[#C4513D] bg-[#C4513D]/6 text-[#A43E2D]"
              : "border-[#B8B8B2] bg-[#FAFAF9] text-[#565650]"
          }`}
        >
          {hasSavedWinnerSelection ? (
            <>
              <span className="font-medium">
                Selección guardada.
              </span>{" "}
              Puedes consultar los ganadores guardados sin confirmar de nuevo.
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
        <p role="alert" className="mx-3 mt-4 rounded-md border border-[#C4513D]/20 bg-[#C4513D]/6 px-3 py-2 text-sm text-[#A43E2D] sm:mx-4">
          Debes seleccionar al menos un participante para continuar.
        </p>
      )}

      {winnerError === "forbidden" && (
        <p role="alert" className="mx-3 mt-4 rounded-md border border-[#C4513D]/20 bg-[#C4513D]/6 px-3 py-2 text-sm text-[#A43E2D] sm:mx-4">
          No tienes permisos para seleccionar ganadores en este formulario.
        </p>
      )}
      {winnerError === "reason" && (
        <p role="alert" className="mx-3 mt-4 border-l-2 border-[#B42318] bg-[#FFF4F2] px-3 py-3 text-sm text-[#9B231B] sm:mx-4">
          Escribe un motivo de selección antes de guardar los ganadores.
        </p>
      )}
      {winnerError === "invalid-response" && (
        <p role="alert" className="mx-3 mt-4 border-l-2 border-[#B42318] bg-[#FFF4F2] px-3 py-3 text-sm text-[#9B231B] sm:mx-4">
          Una o más respuestas seleccionadas ya no están disponibles. Revisa los participantes y vuelve a confirmar.
        </p>
      )}
    </>
  );
}
