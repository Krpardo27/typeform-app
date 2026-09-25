"use client";

import { useMemo, useState } from "react";
import { LuEye } from "react-icons/lu";
import Pagination from "@/shared/components/Pagination";
import { ResponseArticle } from "@/features/typeform/components/responses/ResponseArticle";
import type { MaskedTypeformResponse } from "@/features/typeform/services/typeform.service";

type WorkspaceFormResponsesListProps = {
  highlightedResponses?: MaskedTypeformResponse[];
  highlightedContactsByToken?: Record<string, string>;
  responses: MaskedTypeformResponse[];
  revealedWinnerTokens: string[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
};

function filterUnavailableExpanded(
  tokens: string[],
  availableTokens: string[],
): string[] {
  const available = new Set(availableTokens);

  return tokens.filter((token) => available.has(token));
}

export function WorkspaceFormResponsesList({
  highlightedResponses = [],
  highlightedContactsByToken = {},
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

          <div className="grid gap-4 xl:grid-cols-2">
            {highlightedResponses.map((response, index) => (
              <ResponseArticle
                key={`highlighted-winner-${response.token}`}
                response={response}
                isWinnerVisible={winnerTokenSet.has(response.token)}
                isExpanded={normalizedExpandedTokens.includes(response.token)}
                participantLabel={`Ganador #${index + 1}`}
                contactOverride={highlightedContactsByToken[response.token]}
                variant="winner"
                onToggle={() => toggleToken(response.token)}
              />
            ))}
          </div>
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
        <div className="grid gap-4 xl:grid-cols-2">
          {paginatedResponses.map(({ response, index }) => {
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
          })}
        </div>
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
