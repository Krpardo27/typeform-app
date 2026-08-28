"use client";

import { useMemo, useState } from "react";
import {
  LuCalendarClock,
  LuChevronDown,
  LuEye,
  LuEyeOff,
  LuShieldAlert,
  LuTrophy,
  LuUserRound,
} from "react-icons/lu";
import Pagination from "@/shared/components/Pagination";
import type { MaskedTypeformResponse } from "@/features/typeform/services/typeform.service";

type WorkspaceFormResponsesListProps = {
  highlightedResponses?: MaskedTypeformResponse[];
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

function filterUnavailableExpanded(
  tokens: string[],
  availableTokens: string[],
): string[] {
  const available = new Set(availableTokens);

  return tokens.filter((token) => available.has(token));
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

function ResponseArticle({
  response,
  isWinnerVisible,
  isExpanded,
  participantLabel,
  variant = "default",
  onToggle,
}: {
  response: MaskedTypeformResponse;
  isWinnerVisible: boolean;
  isExpanded: boolean;
  participantLabel: string;
  variant?: "default" | "winner";
  onToggle: () => void;
}) {
  const participantContact = getParticipantContact(response);
  const isWinnerVariant = variant === "winner";

  return (
    <article
      className={`
        relative overflow-hidden rounded-2xl border p-5 shadow-[0_8px_30px_-18px_rgba(0,0,0,0.18)]
        transition-all duration-200 hover:shadow-[0_12px_35px_-20px_rgba(0,0,0,0.22)]
        ${
          isWinnerVariant
            ? "border-[#D5B45D]/60 bg-[#FFFBF0] ring-1 ring-[#F3D98B]/50"
            : "border-[#E8E8E6] bg-white"
        }
      `}
    >
      {isWinnerVariant && (
        <div className="absolute inset-y-0 left-0 w-1.5 bg-[#D5B45D]" />
      )}

      <div
        className={`flex flex-wrap items-start justify-between gap-4 border-b py-4 ${
          isWinnerVariant
            ? "border-l-2 border-l-[#B08D2F] border-b-[#E5E5E5] pl-4"
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

          <p className="mt-1 text-sm text-black/60">{participantContact}</p>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-black/45">
            <span className="inline-flex items-center gap-1.5">
              <LuCalendarClock className="size-3.5" />
              Formulario enviado {formatDate(response.submittedAt)}
            </span>

            <span>Ingreso al formulario {formatDate(response.landedAt)}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div
            className={`flex items-center gap-1.5 text-xs font-medium ${
              isWinnerVisible ? "text-[#007C6A]" : "text-[#C2412D]"
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
        flex size-8 items-center justify-center
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
      ) : null}
    </article>
  );
}

export function WorkspaceFormResponsesList({
  highlightedResponses = [],
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
  const highlightedTokenSet = useMemo(
    () => new Set(highlightedResponses.map((response) => response.token)),
    [highlightedResponses],
  );
  const paginatedResponses = useMemo(
    () =>
      responses
        .map((response, index) => ({ response, index }))
        .filter(({ response }) => !highlightedTokenSet.has(response.token)),
    [highlightedTokenSet, responses],
  );

  const responseTokens = useMemo(
    () => [
      ...highlightedResponses.map((response) => response.token),
      ...paginatedResponses.map(({ response }) => response.token),
    ],
    [highlightedResponses, paginatedResponses],
  );

  const [expandedTokens, setExpandedTokens] = useState<string[]>(
    highlightedResponses.length > 0
      ? highlightedResponses.map((response) => response.token)
      : responses[0]
        ? [responses[0].token]
        : [],
  );

  const normalizedExpandedTokens = useMemo(
    () => filterUnavailableExpanded(expandedTokens, responseTokens),
    [expandedTokens, responseTokens],
  );

  const allExpanded =
    paginatedResponses.length > 0 &&
    paginatedResponses.every(({ response }) =>
      normalizedExpandedTokens.includes(response.token),
    );

  function toggleToken(token: string) {
    setExpandedTokens((prev) => {
      const base = filterUnavailableExpanded(prev, responseTokens);

      return base.includes(token)
        ? base.filter((value) => value !== token)
        : [...base, token];
    });
  }

  function expandAll() {
    setExpandedTokens([
      ...highlightedResponses.map((response) => response.token),
      ...paginatedResponses.map(({ response }) => response.token),
    ]);
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
        showAllPageSizeOption
        showLastPageButton
      />

      {responseTokens.length > 0 && (
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

      {highlightedResponses.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <LuEye className="size-4 text-[#00A88F]" />
            <h2 className="text-sm font-semibold text-[#111111]">
              Ganadores seleccionados
            </h2>
          </div>

          {highlightedResponses.map((response, index) => (
            <ResponseArticle
              key={`highlighted-winner-${response.token}`}
              response={response}
              isWinnerVisible={winnerTokenSet.has(response.token)}
              isExpanded={normalizedExpandedTokens.includes(response.token)}
              participantLabel={`Ganador #${index + 1}`}
              variant="winner"
              onToggle={() => toggleToken(response.token)}
            />
          ))}
        </section>
      )}

      {responseTokens.length === 0 ? (
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
        paginatedResponses.map(({ response, index }) => {
          const isWinnerVisible = winnerTokenSet.has(response.token);

          const isExpanded = normalizedExpandedTokens.includes(response.token);

          const responseNumber =
            (safeCurrentPage - 1) * itemsPerPage + index + 1;

          return (
            <ResponseArticle
              key={response.token}
              response={response}
              isWinnerVisible={isWinnerVisible}
              isExpanded={isExpanded}
              participantLabel={`Participante #${responseNumber}`}
              onToggle={() => toggleToken(response.token)}
            />
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
        showAllPageSizeOption
        showLastPageButton
      />
    </section>
  );
}
