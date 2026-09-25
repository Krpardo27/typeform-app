"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Swal from "sweetalert2";
import { LuSearch, LuTrophy } from "react-icons/lu";
import FormSubmit from "../forms/FormSubmit";

type WinnerCandidate = {
  token: string;
  label: string;
  detail?: string;
  participantNumber?: number | string;
  selected?: boolean;
};

type WinnerSelectionPanelProps = {
  action: (formData: FormData) => void | Promise<void>;
  candidates: WinnerCandidate[];
  currentPage: number;
  itemsPerPage: number;
  pageSizeValue?: string;
  winnerSelection?: string;
  winnerError?: string;
};

const DEFAULT_WINNER_REASON = "Selección manual de ganadores";

export function deduplicateWinnerCandidates(candidates: WinnerCandidate[]) {
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    const key = `${candidate.token}|${candidate.label}|${candidate.detail ?? ""}|${candidate.participantNumber ?? ""}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getParticipantReference(
  candidate?: WinnerCandidate,
  fallback?: string,
) {
  const rawNumber = String(
    candidate?.participantNumber ?? candidate?.detail ?? "",
  )
    .replace(/^#/, "")
    .trim();

  if (rawNumber) {
    return `#${rawNumber}`;
  }

  return fallback ?? "Participante";
}

function formatParticipantReferences(references: string[]) {
  if (references.length <= 1) {
    return references[0] ?? "";
  }

  if (references.length === 2) {
    return `${references[0]} y ${references[1]}`;
  }

  return `${references.slice(0, -1).join(", ")} y ${references.at(-1)}`;
}

function areTokenSetsEqual(first: Set<string>, second: Set<string>) {
  if (first.size !== second.size) {
    return false;
  }

  for (const token of first) {
    if (!second.has(token)) {
      return false;
    }
  }

  return true;
}

export function WinnerSelectionPanel({
  action,
  candidates,
  currentPage,
  itemsPerPage,
  pageSizeValue,
  winnerSelection,
  winnerError,
}: WinnerSelectionPanelProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState("");
  const [reason, setReason] = useState(DEFAULT_WINNER_REASON);
  const [isPending, startTransition] = useTransition();

  const uniqueCandidates = useMemo(
    () => deduplicateWinnerCandidates(candidates),
    [candidates],
  );

  const candidateSelectionKey = uniqueCandidates
    .map(
      (candidate) =>
        `${candidate.token}:${candidate.selected ? "selected" : "unselected"}`,
    )
    .join("|");

  const initialSelectedTokens = useMemo(
    () =>
      new Set(
        uniqueCandidates
          .filter((candidate) => candidate.selected)
          .map((candidate) => candidate.token),
      ),
    [uniqueCandidates],
  );

  const [selectedTokenState, setSelectedTokenState] = useState<{
    key: string;
    tokens: Set<string>;
  }>(() => ({
    key: candidateSelectionKey,
    tokens: initialSelectedTokens,
  }));

  const selectedTokens =
    selectedTokenState.key === candidateSelectionKey
      ? selectedTokenState.tokens
      : initialSelectedTokens;

  function updateSelectedTokens(
    nextTokens: Set<string> | ((current: Set<string>) => Set<string>),
  ) {
    setSelectedTokenState((currentState) => {
      const currentTokens =
        currentState.key === candidateSelectionKey
          ? currentState.tokens
          : initialSelectedTokens;

      return {
        key: candidateSelectionKey,
        tokens:
          typeof nextTokens === "function"
            ? nextTokens(currentTokens)
            : nextTokens,
      };
    });
  }

  const hasSelectionChanged = !areTokenSetsEqual(
    selectedTokens,
    initialSelectedTokens,
  );
  const hasReasonChanged = reason.trim() !== DEFAULT_WINNER_REASON;
  const canSubmitSelection =
    hasSelectionChanged || (selectedTokens.size > 0 && hasReasonChanged);

  const filteredCandidates = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) return uniqueCandidates;

    const normalizedQuery = normalized.replace(/^#/, "");
    const isNumericQuery = /^\d+$/.test(normalizedQuery);

    return uniqueCandidates.filter((candidate) => {
      const participantNumber = String(candidate.participantNumber ?? "")
        .replace(/^#/, "")
        .trim()
        .toLowerCase();
      const detail = String(candidate.detail ?? "")
        .replace(/^#/, "")
        .toLowerCase();
      const haystack =
        `${candidate.label} ${detail} ${participantNumber}`.toLowerCase();

      if (isNumericQuery) {
        return (
          participantNumber === normalizedQuery ||
          detail === normalizedQuery ||
          haystack.includes(normalizedQuery)
        );
      }

      return haystack.includes(normalizedQuery);
    });
  }, [uniqueCandidates, query]);

  const confirmAndSubmit = async () => {
    const form = formRef.current;
    if (!form || isPending) {
      return;
    }

    const selectedTokenList = [...selectedTokens];
    const selectedCount = selectedTokenList.length;

    const selectedReferences = selectedTokenList.slice(0, 3).map((token) => {
      const candidate = candidates.find((item) => item.token === token);
      return getParticipantReference(candidate, token);
    });
    const selectedPreview = formatParticipantReferences(selectedReferences);

    const hasMore = selectedCount > 3;
    const participantLabel =
      selectedCount === 1 ? "Participante" : "Participantes";
    const participantText = hasMore
      ? `${participantLabel}: ${selectedPreview} y ${selectedCount - 3} participante(s) más.`
      : `${participantLabel}: ${selectedPreview}`;
    const isClearingWinners = selectedCount === 0;

    const result = await Swal.fire({
      title: isClearingWinners
        ? "Quitar ganadores"
        : selectedCount === 1
          ? "Confirmar ganador"
          : "Confirmar ganadores",
      text: isClearingWinners
        ? "Se ocultará nuevamente la información completa de los ganadores actuales."
        : participantText,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: isClearingWinners
        ? "Quitar selección"
        : "Confirmar selección",
      cancelButtonText: "Cancelar",
      background: "#FFFFFF",
      color: "#000000",
      confirmButtonColor: "#10b981",
    });

    if (!result.isConfirmed) {
      return;
    }

    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      form.querySelector<HTMLInputElement>('input[name="reason"]')?.focus();
      return;
    }

    const formData = new FormData(form);
    formData.delete("winnerToken");
    formData.set("reason", trimmedReason);

    for (const token of selectedTokenList) {
      formData.append("winnerToken", token);
    }

    startTransition(async () => {
      await action(formData);
    });
  };

  const handleSubmit: NonNullable<
    React.ComponentProps<"form">["onSubmit"]
  > = async (event) => {
    event.preventDefault();

    if (isPending) {
      return;
    }

    await confirmAndSubmit();
  };

  const handleCandidateChange = (token: string, checked: boolean) => {
    updateSelectedTokens((prev) => {
      const next = new Set(prev);
      if (checked) next.add(token);
      else next.delete(token);
      return next;
    });
  };

  return (
    <section
      key={candidateSelectionKey}
      className="mt-6 max-w-3xl border-t border-[#E8E8E6] pt-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <LuTrophy className="size-4 text-[#00A88F]" />
            <h2 className="text-sm font-semibold text-[#000000]">
              Selección de ganadores
            </h2>
          </div>

          <p className="mt-1 text-sm text-[#000000]/55">
            Selecciona uno o más participantes para mostrar sus datos completos.
          </p>
        </div>

        <span className="shrink-0 text-sm text-[#000000]/50">
          {selectedTokens.size} seleccionados
        </span>
      </div>

      {winnerSelection === "1" && (
        <p className="mt-4 text-sm text-[#00A88F]">
          Ganadores seleccionados. La información completa solo está disponible
          para los participantes elegidos.
        </p>
      )}

      {winnerError === "empty" && (
        <p className="mt-4 text-sm text-[#B45309]">
          Debes seleccionar al menos un participante para continuar.
        </p>
      )}

      {winnerError === "forbidden" && (
        <p className="mt-4 text-sm text-[#DC2626]">
          No tienes permisos para seleccionar ganadores en este formulario.
        </p>
      )}

      <form
        ref={formRef}
        action={action}
        onSubmit={handleSubmit}
        aria-busy={isPending}
        className={`mt-5 space-y-5 transition-opacity ${
          isPending ? "pointer-events-none opacity-60" : "opacity-100"
        }`}
      >
        <input type="hidden" name="page" value={String(currentPage)} />
        <input
          type="hidden"
          name="pageSize"
          value={pageSizeValue ?? String(itemsPerPage)}
        />

        <div>
          <label
            htmlFor="winner-search"
            className="mb-2 block text-sm font-medium text-[#000000]"
          >
            Participantes
          </label>

          <div className="relative">
            <LuSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#000000]/35" />

            <input
              id="winner-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre o número de participante"
              disabled={isPending}
              className="w-full border border-[#DCDCD9] bg-white py-2.5 pl-10 pr-3 text-sm text-[#000000] placeholder:text-[#000000]/40 outline-none transition focus:border-[#000000] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        </div>

        <div className="border border-[#E8E8E6] bg-white">
          <div className="border-b border-[#E8E8E6] px-3 py-2">
            <span className="text-xs font-medium text-[#000000]/50">
              {filteredCandidates.length} participantes
            </span>
          </div>

          <div className="max-h-88 overflow-y-auto">
            {filteredCandidates.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[#000000]/50">
                No hay participantes que coincidan con tu búsqueda.
              </div>
            ) : (
              <div className="divide-y divide-[#E8E8E6]">
                {filteredCandidates.map((candidate) => (
                  <label
                    key={`winner-${candidate.token}`}
                    className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-[#F8F8F7]"
                  >
                    <input
                      type="checkbox"
                      name="winnerToken"
                      value={candidate.token}
                      checked={selectedTokens.has(candidate.token)}
                      disabled={isPending}
                      onChange={(event) => {
                        handleCandidateChange(
                          candidate.token,
                          event.target.checked,
                        );
                      }}
                      className="size-4 accent-[#00BFA5] disabled:cursor-not-allowed"
                    />

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-[#000000]">
                        {candidate.label}
                      </span>

                      {candidate.detail && (
                        <span className="mt-0.5 block truncate text-xs text-[#000000]/45">
                          {candidate.detail}
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="winner-reason"
            className="mb-2 block text-sm font-medium text-[#000000]"
          >
            Motivo de selección
          </label>

          <input
            id="winner-reason"
            type="text"
            name="reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
            disabled={isPending}
            className="w-full border border-[#DCDCD9] bg-white px-3 py-2.5 text-sm text-[#000000] outline-none transition focus:border-[#000000] disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-[#E8E8E6] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-[#000000]/50">
            {selectedTokens.size === 0
              ? "Ningún participante seleccionado"
              : `${selectedTokens.size} participante${
                  selectedTokens.size !== 1 ? "s" : ""
                } seleccionado${selectedTokens.size !== 1 ? "s" : ""}`}
          </span>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={isPending || !canSubmitSelection}
              onClick={() => {
                updateSelectedTokens(new Set());
              }}
              className="px-3 py-2 text-sm font-medium text-[#000000]/60 transition-colors hover:text-[#000000] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Limpiar
            </button>

            <FormSubmit
              value={
                isPending
                  ? "Guardando..."
                  : !canSubmitSelection
                    ? "Sin cambios"
                  : selectedTokens.size === 0 && hasSelectionChanged
                    ? "Quitar ganadores"
                    : "Confirmar ganadores"
              }
              disabled={isPending || !canSubmitSelection}
              className="border border-[#00BFA5] bg-[#00BFA5] px-4 py-2 text-sm font-medium text-white transition-colors hover:border-[#00A88F] hover:bg-[#00A88F] disabled:cursor-not-allowed disabled:border-[#DCDCD9] disabled:bg-[#DCDCD9]"
            />
          </div>
        </div>
      </form>
    </section>
  );
}
