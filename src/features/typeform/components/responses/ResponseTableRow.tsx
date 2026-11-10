import { useId } from "react";
import {
  LuCalendarClock,
  LuChevronDown,
  LuLockKeyhole,
  LuTrophy,
  LuUserRound,
} from "react-icons/lu";
import type { MaskedTypeformResponse } from "@/features/typeform/services/typeform.service";
import { ParticipantContact } from "@/features/typeform/components/responses/ParticipantContact";
import { QuestionAnswerCard } from "@/features/typeform/components/responses/QuestionAnswerCard";

const TABLE_CELL_CLASSNAME = "px-3 py-3 align-top text-sm text-[#111111] sm:px-4";

function formatDate(value?: string) {
  if (!value) return "Sin fecha";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha inválida";
  }

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date) + " UTC";
}

function AnswerSection({
  title,
  answers,
  emptyMessage,
}: {
  title: string;
  answers: MaskedTypeformResponse["answers"];
  emptyMessage: string;
}) {
  return (
    <section className="rounded-md border border-[#E8E8E6] bg-white">
      <div className="border-b border-[#E8E8E6] px-4 py-3">
        <p className="text-sm font-medium text-[#595954]">
          {title} ({answers.length})
        </p>
      </div>

      {answers.length === 0 ? (
        <div className="px-4 py-3 text-sm text-[#595954]">
          {emptyMessage}
        </div>
      ) : (
        <div>
          {answers.map((answer) => (
            <QuestionAnswerCard key={answer.id} answer={answer} />
          ))}
        </div>
      )}
    </section>
  );
}

export function ResponseTableRow({
  response,
  isExpanded,
  participantLabel,
  contactOverride,
  variant = "default",
  colSpan = 5,
  onToggle,
}: {
  response: MaskedTypeformResponse;
  isExpanded: boolean;
  participantLabel: string;
  contactOverride?: string;
  variant?: "default" | "winner";
  colSpan?: number;
  onToggle: () => void;
}) {
  const canReveal = response.visibility === "winner";
  const expanded = canReveal && isExpanded;
  const isWinnerVariant = canReveal && variant === "winner";
  const detailsId = useId();
  const toggleLabel = `${expanded ? "Contraer" : "Expandir"} respuesta de ${participantLabel}`;

  return (
    <>
      <tr
        onClick={canReveal ? onToggle : undefined}
        className={`group border-b border-[#E8E8E6] transition-colors motion-reduce:transition-none ${canReveal ? "cursor-pointer" : ""} ${
          expanded
            ? "bg-[#FFF8F5]"
            : "bg-white hover:bg-[#FAFAF9] focus-within:bg-[#FFF8F5]"
        } ${
          isWinnerVariant ? "border-l-2 border-l-[#FF5C35]/60" : ""
        }`}
      >
        <td className={TABLE_CELL_CLASSNAME}>
          <div className="flex items-center gap-2">
            {isWinnerVariant ? (
              <LuTrophy aria-hidden="true" className="size-3.5 shrink-0 text-[#A53318]" />
            ) : (
              <LuUserRound aria-hidden="true" className="size-3.5 shrink-0 text-[#595954]" />
            )}

            <span
              className={`font-medium ${
                isWinnerVariant ? "text-[#A53318]" : "text-[#111111]"
              }`}
            >
              {participantLabel}
            </span>
          </div>
        </td>

        <td className={TABLE_CELL_CLASSNAME}>
          <span className="text-[#595954] wrap-anywhere">
            <ParticipantContact
              response={response}
              contactOverride={contactOverride}
            />
          </span>
        </td>

        <td className={TABLE_CELL_CLASSNAME}>
          {canReveal ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-[#595954]">
            <LuCalendarClock aria-hidden="true" className="size-3.5 shrink-0" />
            {formatDate(response.submittedAt)}
          </span>
          ) : <span aria-label="Fecha oculta" className="text-[#737373]">—</span>}
        </td>

        <td className={TABLE_CELL_CLASSNAME}>
          {canReveal ? (
          <span className="text-sm text-[#595954]">
            {response.answers.length} {response.answers.length === 1 ? "dato visible" : "datos visibles"}
          </span>
          ) : <span aria-label="Respuestas ocultas" className="text-[#737373]">—</span>}
        </td>

        <td className="px-3 py-3 text-right align-top sm:px-4">
          {canReveal ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggle();
            }}
            aria-expanded={expanded}
            aria-controls={detailsId}
            aria-label={toggleLabel}
            className={`inline-flex size-11 cursor-pointer items-center justify-center rounded-md border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35] motion-reduce:transition-none ${
              expanded
                ? "border-[#FF5C35] bg-[#FFF1EC] text-[#A53318]"
                : "border-[#FF5C35]/35 text-[#595954] hover:border-[#FF5C35] hover:bg-white hover:text-[#A53318]"
            }`}
          >
            <LuChevronDown
              aria-hidden="true"
              className={`size-4 transition-transform duration-200 motion-reduce:transition-none ${
                expanded ? "rotate-180" : ""
              }`}
            />
          </button>
          ) : (
            <span title="Datos ocultos hasta confirmar ganador" className="inline-flex size-11 items-center justify-center text-[#737373]">
              <LuLockKeyhole aria-hidden="true" className="size-4" />
              <span className="sr-only">Datos ocultos hasta confirmar ganador</span>
            </span>
          )}
        </td>
      </tr>

      {expanded ? (
        <tr id={detailsId} className="border-b border-[#E8E8E6] bg-[#F7F7F6]">
          <td colSpan={colSpan} className="px-3 py-4 sm:px-4 sm:py-5">
            <div className="max-w-5xl">
              <AnswerSection
                title="Datos visibles del participante"
                answers={response.answers}
                emptyMessage="No hay respuestas visibles."
              />
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}