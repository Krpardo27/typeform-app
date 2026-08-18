"use client";

import { useMemo, useState } from "react";
import {
  LuCalendarClock,
  LuChevronDown,
  LuEye,
  LuEyeOff,
  LuShieldAlert,
  LuUserRound,
} from "react-icons/lu";
import Pagination from "@/shared/components/Pagination";
import type { MaskedTypeformResponse } from "@/features/typeform/services/typeform.service";

type WorkspaceFormResponsesListProps = {
  responses: MaskedTypeformResponse[];
  revealedWinnerTokens: string[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
};

function formatDate(value?: string) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getParticipantContact(response: MaskedTypeformResponse): string {
  const candidates = [...response.answers, ...response.hidden];

  const byQuestionHint = candidates.find((answer) => {
    const question = answer.question.toLowerCase();

    return question.includes("email") || question.includes("correo");
  });

  if (byQuestionHint?.value?.trim()) {
    return byQuestionHint.value.trim();
  }

  const byEmailPattern = candidates.find((answer) =>
    /[^\s@]+@[^\s@]+\.[^\s@]+/.test(answer.value),
  );

  if (byEmailPattern?.value?.trim()) {
    return byEmailPattern.value.trim();
  }

  return "Sin email visible";
}

function QuestionAnswerCard({
  responseToken,
  answer,
}: {
  responseToken: string;
  answer: MaskedTypeformResponse["answers"][number];
}) {
  return (
    <div
      key={`${responseToken}-${answer.id}`}
      className="
        rounded-xl
        border border-[#E8E8E6]
        bg-[#F7F7F6]
        p-3.5
      "
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[#000000]/45">
          {answer.question}
        </p>

        {answer.masked ? (
          <span
            className="
              inline-flex shrink-0 items-center gap-1
              rounded-full
              border border-[#FF5C35]/30
              bg-[#FF5C35]/10
              px-2 py-0.5
              text-[10px] font-medium
              text-[#FF5C35]
            "
          >
            <LuEyeOff className="size-3" />
            Oculto
          </span>
        ) : (
          <span
            className="
              inline-flex shrink-0 items-center gap-1
              rounded-full
              border border-[#7C3AED]/30
              bg-[#7C3AED]/10
              px-2 py-0.5
              text-[10px] font-medium
              text-[#7C3AED]
            "
          >
            <LuEye className="size-3" />
            Visible
          </span>
        )}
      </div>

      <p className="mt-2 wrap-break-word text-sm text-[#000000]/80">
        {answer.value}
      </p>
    </div>
  );
}

export function WorkspaceFormResponsesList({
  responses,
  revealedWinnerTokens,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
}: WorkspaceFormResponsesListProps) {
  const safeCurrentPage = Math.min(currentPage, Math.max(1, totalPages));

  const safeTotalPages = Math.max(1, totalPages);

  const winnerTokenSet = useMemo(
    () => new Set(revealedWinnerTokens),
    [revealedWinnerTokens],
  );

  const responseTokens = useMemo(
    () => responses.map((response) => response.token),
    [responses],
  );

  const [expandedTokens, setExpandedTokens] = useState<string[]>(
    responses[0] ? [responses[0].token] : [],
  );

  function filterUnavailableExpanded(tokens: string[]): string[] {
    const available = new Set(responseTokens);

    return tokens.filter((token) => available.has(token));
  }

  const normalizedExpandedTokens = filterUnavailableExpanded(expandedTokens);

  const allExpanded =
    responses.length > 0 &&
    normalizedExpandedTokens.length === responses.length;

  function toggleToken(token: string) {
    setExpandedTokens((prev) => {
      const base = filterUnavailableExpanded(prev);

      return base.includes(token)
        ? base.filter((value) => value !== token)
        : [...base, token];
    });
  }

  function expandAll() {
    setExpandedTokens(responses.map((response) => response.token));
  }

  function collapseAll() {
    setExpandedTokens([]);
  }

  return (
    <section className="mt-8 space-y-5">
      <Pagination
        currentPage={safeCurrentPage}
        totalPages={safeTotalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        itemLabel="participantes"
        showPageSizeSelector
      />

      {responses.length > 0 && (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={expandAll}
            disabled={allExpanded}
            className="
              rounded-xl
              border border-[#E8E8E6]
              bg-white
              px-3 py-1.5
              text-xs font-medium
              text-[#000000]/70
              shadow-sm
              transition-all
              hover:border-[#7C3AED]/30
              hover:text-[#7C3AED]
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            Expandir todo
          </button>

          <button
            type="button"
            onClick={collapseAll}
            disabled={normalizedExpandedTokens.length === 0}
            className="
              rounded-xl
              border border-[#E8E8E6]
              bg-white
              px-3 py-1.5
              text-xs font-medium
              text-[#000000]/70
              shadow-sm
              transition-all
              hover:border-[#000000]/20
              hover:text-[#000000]
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            Contraer todo
          </button>
        </div>
      )}

      {responses.length === 0 ? (
        <div
          className="
            rounded-2xl
            border border-dashed border-[#E8E8E6]
            bg-white
            px-6 py-12
            text-center
            shadow-[0_8px_30px_-18px_rgba(0,0,0,0.18)]
          "
        >
          <p className="text-sm font-medium text-[#000000]/80">
            No hay respuestas para esta página
          </p>

          <p className="mt-1 text-xs text-[#000000]/55">
            Ajusta la paginación o espera nuevas respuestas de Typeform.
          </p>
        </div>
      ) : (
        responses.map((response, index) => {
          const isWinnerVisible = winnerTokenSet.has(response.token);

          const isExpanded = normalizedExpandedTokens.includes(response.token);

          const responseNumber =
            (safeCurrentPage - 1) * itemsPerPage + index + 1;

          const participantContact = getParticipantContact(response);

          return (
            <article
              key={response.token}
              className="
                rounded-2xl
                border border-[#E8E8E6]
                bg-white
                p-5
                shadow-[0_8px_30px_-18px_rgba(0,0,0,0.18)]
                transition-all
                duration-200
                hover:shadow-[0_12px_35px_-20px_rgba(0,0,0,0.22)]
              "
            >
              <div
                className="
                  flex flex-wrap
                  items-start justify-between
                  gap-4
                  border-b border-[#E8E8E6]
                  pb-4
                "
              >
                <div className="min-w-0 flex-1">
                  <p
                    className="
                      inline-flex items-center gap-1.5
                      rounded-full
                      border border-[#E8E8E6]
                      bg-[#F7F7F6]
                      px-2.5 py-1
                      text-[11px]
                      text-[#000000]/55
                    "
                  >
                    <LuUserRound className="size-3.5" />
                    Participante #{responseNumber}
                  </p>

                  <p className="mt-2 text-sm font-semibold text-[#111111]">
                    Token: {response.token}
                  </p>

                  <p className="mt-1 text-xs text-[#000000]/55">
                    Contacto: {participantContact}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#000000]/55">
                    <span className="inline-flex items-center gap-1.5">
                      <LuCalendarClock className="size-3.5" />
                      Enviado: {formatDate(response.submittedAt)}
                    </span>

                    <span>Llegada: {formatDate(response.landedAt)}</span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`
                      inline-flex items-center gap-1.5
                      rounded-full
                      border
                      px-2.5 py-1
                      text-xs
                      ${
                        isWinnerVisible
                          ? "border-[#00BFA5]/30 bg-[#00BFA5]/10 text-[#00A88F]"
                          : "border-[#FF5C35]/30 bg-[#FF5C35]/10 text-[#FF5C35]"
                      }
                    `}
                  >
                    {isWinnerVisible ? (
                      <LuEye className="size-3.5" />
                    ) : (
                      <LuShieldAlert className="size-3.5" />
                    )}

                    {isWinnerVisible
                      ? "Ganador visible por selección"
                      : "Datos sensibles ocultos"}
                  </span>

                  <button
                    type="button"
                    onClick={() => toggleToken(response.token)}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? "Contraer respuesta" : "Expandir respuesta"}
                    className="flex size-7 items-center justify-center rounded-lg border border-[#E8E8E6] bg-[#F7F7F6] text-[#000000]/45 transition hover:bg-[#E8E8E6]"
                  >
                    <LuChevronDown
                      className={`
                        size-4 shrink-0
                        transition-transform
                        ${isExpanded ? "rotate-180" : "rotate-0"}
                      `}
                    />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
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
              )}
            </article>
          );
        })
      )}

      <Pagination
        currentPage={safeCurrentPage}
        totalPages={safeTotalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        itemLabel="participantes"
        showPageSizeSelector
      />
    </section>
  );
}
