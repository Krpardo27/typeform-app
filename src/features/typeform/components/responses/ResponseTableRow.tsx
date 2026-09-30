import { Fragment } from "react";
import {
  LuCalendarClock,
  LuChevronDown,
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
  }).format(date);
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
    <section className="rounded-xl border border-[#E8E8E6] bg-white">
      <div className="border-b border-[#E8E8E6] px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#000000]/45">
          {title} ({answers.length})
        </p>
      </div>

      {answers.length === 0 ? (
        <div className="px-4 py-3 text-xs text-[#000000]/55">
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
  colSpan = 6,
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
  const isWinnerVariant = variant === "winner";
  const detailsId = `response-${response.token}-details`;
  const toggleLabel = isExpanded ? "Contraer respuesta" : "Expandir respuesta";

  return (
    <Fragment>
      <tr
        tabIndex={0}
        role="button"
        aria-expanded={isExpanded}
        aria-controls={detailsId}
        aria-label={toggleLabel}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle();
          }
        }}
        className={`group cursor-pointer border-b border-[#E8E8E6] transition-colors ${
          isExpanded
            ? "bg-[#F7F7F6]"
            : "bg-white hover:bg-zinc-200/70 focus:bg-[#FAFAF9] focus-within:bg-[#FAFAF9]"
        } ${
          isWinnerVariant ? "shadow-[inset_3px_0_0_#D5B45D]" : ""
        }`}
      >
        <td className={TABLE_CELL_CLASSNAME}>
          <div className="flex items-center gap-2">
            {isWinnerVariant ? (
              <LuTrophy className="size-3.5 text-[#A67C00]" />
            ) : (
              <LuUserRound className="size-3.5 text-black/40" />
            )}

            <span
              className={`font-medium ${
                isWinnerVariant ? "text-[#8A6A00]" : "text-[#111111]"
              }`}
            >
              {participantLabel}
            </span>
          </div>
        </td>

        <td className={TABLE_CELL_CLASSNAME}>
          <span className="text-[#000000]/65">
            <ParticipantContact
              response={response}
              contactOverride={contactOverride}
            />
          </span>
        </td>

        <td className={TABLE_CELL_CLASSNAME}>
          <span className="inline-flex items-center gap-1.5 text-xs text-[#000000]/50">
            <LuCalendarClock className="size-3.5" />
            {formatDate(response.submittedAt)}
          </span>
        </td>

        <td className={TABLE_CELL_CLASSNAME}>
          <span className="text-xs text-[#000000]/55">
            {response.answers.length} datos visibles
          </span>
        </td>

        <td className="px-3 py-3 text-right align-top sm:px-4">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggle();
            }}
            aria-expanded={isExpanded}
            aria-controls={detailsId}
            aria-label={toggleLabel}
            className={`inline-flex cursor-pointer size-8 items-center justify-center rounded-lg border transition-colors ${
              isExpanded
                ? "border-[#111111] bg-[#111111] text-white hover:bg-black"
                : "border-[#E5E5E5] text-black/50 hover:border-black/20 hover:bg-white hover:text-black"
            }`}
          >
            <LuChevronDown
              className={`size-4 transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </button>
        </td>
      </tr>

      {isExpanded ? (
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
    </Fragment>
  );
}