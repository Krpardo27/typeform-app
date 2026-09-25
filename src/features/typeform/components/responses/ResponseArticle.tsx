import {
  LuCalendarClock,
  LuChevronDown,
  LuEye,
  LuShieldAlert,
  LuTrophy,
  LuUserRound,
} from "react-icons/lu";
import type { MaskedTypeformResponse } from "@/features/typeform/services/typeform.service";
import { ParticipantContact } from "@/features/typeform/components/responses/ParticipantContact";
import { QuestionAnswerCard } from "@/features/typeform/components/responses/QuestionAnswerCard";

function formatDate(value?: string) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ResponseArticle({
  response,
  isWinnerVisible,
  isExpanded,
  participantLabel,
  contactOverride,
  variant = "default",
  onToggle,
}: {
  response: MaskedTypeformResponse;
  isWinnerVisible: boolean;
  isExpanded: boolean;
  participantLabel: string;
  contactOverride?: string;
  variant?: "default" | "winner";
  onToggle: () => void;
}) {
  const isWinnerVariant = variant === "winner";

  return (
    <article
      className={`
        relative h-fit overflow-hidden rounded-2xl border p-4 shadow-[0_8px_30px_-18px_rgba(0,0,0,0.18)] sm:p-5
        transition-all duration-200 hover:shadow-[0_12px_35px_-20px_rgba(0,0,0,0.22)]
        ${
          isWinnerVariant
            ? "border-[#D5B45D]/60 bg-[#FFFBF0]"
            : "border-[#E8E8E6] bg-white"
        }
      `}
    >
      {isWinnerVariant && (
        <div className="absolute inset-y-0 left-0 w-1.5 bg-[#D5B45D]" />
      )}

      <div
        className={`flex flex-wrap items-start justify-between gap-4 border-b pb-4 ${
          isWinnerVariant
            ? "border-b-[#E5E5E5] pl-3"
            : "border-[#E5E5E5]"
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {isWinnerVariant ? (
              <>
                <LuTrophy className="size-4 text-[#A67C00]" />
                <span className="text-xs font-medium uppercase tracking-wide text-[#8A6A00]">
                  Ganador
                </span>
              </>
            ) : (
              <>
                <LuUserRound className="size-4 text-black/45" />
                <span className="text-xs font-medium text-black/55">
                  {participantLabel}
                </span>
              </>
            )}
          </div>

          <p className="mt-3 text-sm font-semibold text-[#111]">
            {response.token}
          </p>

          <p className="mt-1 text-sm text-black/60">
            <ParticipantContact
              response={response}
              contactOverride={contactOverride}
            />
          </p>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-black/45">
            <span className="inline-flex items-center gap-1.5">
              <LuCalendarClock className="size-3.5" />
              Formulario enviado {formatDate(response.submittedAt)}
            </span>

            <span>Ingreso al formulario {formatDate(response.landedAt)}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div
            className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${
              isWinnerVisible
                ? "bg-[#00A88F]/10 text-[#007C6A]"
                : "bg-[#C2412D]/10 text-[#C2412D]"
            }`}
          >
            {isWinnerVisible ? (
              <LuEye className="size-3.5" />
            ) : (
              <LuShieldAlert className="size-3.5" />
            )}

            <span>{isWinnerVisible ? "Visible" : "Datos ocultos"}</span>
          </div>

          <button
            type="button"
            onClick={onToggle}
            aria-expanded={isExpanded}
            aria-label={
              isExpanded ? "Contraer respuesta" : "Expandir respuesta"
            }
            className="
              flex size-8 items-center justify-center rounded-lg
              border border-[#E5E5E5]
              text-black/50
              transition-colors
              hover:border-black/20
              hover:bg-[#F7F7F7]
              hover:text-black
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            <LuChevronDown
              className={`size-4 transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {isExpanded ? (
        <div className="mt-4 grid gap-4">
          <section className="space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#000000]/45">
              Respuestas visibles ({response.answers.length})
            </p>

            {response.answers.length === 0 ? (
              <div
                className="
                  rounded-xl
                  border border-[#E8E8E6]
                  bg-[#F7F7F6]
                  px-3 py-2
                  text-xs
                  text-[#000000]/55
                "
              >
                No hay respuestas visibles.
              </div>
            ) : (
              <div className="space-y-2.5">
                {response.answers.map((answer) => (
                  <QuestionAnswerCard
                    key={`${response.token}-${answer.id}`}
                    responseToken={response.token}
                    answer={answer}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#000000]/45">
              Campos protegidos ({response.hidden.length})
            </p>

            {response.hidden.length === 0 ? (
              <div
                className="
                  rounded-xl
                  border border-[#E8E8E6]
                  bg-[#F7F7F6]
                  px-3 py-2
                  text-xs
                  text-[#000000]/55
                "
              >
                No hay campos protegidos.
              </div>
            ) : (
              <div className="space-y-2.5">
                {response.hidden.map((answer) => (
                  <QuestionAnswerCard
                    key={`${response.token}-${answer.id}`}
                    responseToken={response.token}
                    answer={answer}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </article>
  );
}
