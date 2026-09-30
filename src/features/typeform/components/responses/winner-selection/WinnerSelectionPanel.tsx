"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Swal from "sweetalert2";
import { LuTrophy } from "react-icons/lu";
import { DEFAULT_WINNER_REASON } from "./constants";
import { RandomSelectionControls } from "./RandomSelectionControls";
import { SelectionFooter } from "./SelectionFooter";
import { SelectionStatus } from "./SelectionStatus";
import type { WinnerSelectionPanelProps } from "./types";
import {
  areTokenSetsEqual,
  deduplicateWinnerCandidates,
  formatParticipantReferences,
  getParticipantReference,
  getRandomIndexes,
} from "./utils";
import { WinnerCandidatesTable } from "./WinnerCandidatesTable";

export function WinnerSelectionPanel({
  action,
  candidates,
  currentPage,
  initialRegionFilter,
  itemsPerPage,
  pageSizeValue,
  winnerSelection,
  winnerError,
}: WinnerSelectionPanelProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState(initialRegionFilter ?? "");
  const [randomWinnerCount, setRandomWinnerCount] = useState("1");
  const [reason, setReason] = useState(DEFAULT_WINNER_REASON);
  const [isRandomizing, setIsRandomizing] = useState(false);
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
  const hasSavedWinnerSelection = initialSelectedTokens.size > 0;

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

  const regionOptions = useMemo(
    () =>
      [
        ...new Set(
          uniqueCandidates
            .map((candidate) => candidate.region)
            .filter((region): region is string => Boolean(region)),
        ),
      ].sort((first, second) => first.localeCompare(second, "es")),
    [uniqueCandidates],
  );

  const filteredCandidates = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const regionCandidates = regionFilter
      ? uniqueCandidates.filter(
          (candidate) => candidate.region === regionFilter,
        )
      : uniqueCandidates;

    if (!normalized) return regionCandidates;

    const normalizedQuery = normalized.replace(/^#/, "");
    const isNumericQuery = /^\d+$/.test(normalizedQuery);

    return regionCandidates.filter((candidate) => {
      const participantNumber = String(candidate.participantNumber ?? "")
        .replace(/^#/, "")
        .trim()
        .toLowerCase();
      const detail = String(candidate.detail ?? "")
        .replace(/^#/, "")
        .toLowerCase();
      const region = String(candidate.region ?? "").toLowerCase();
      const comuna = String(candidate.comuna ?? "").toLowerCase();
      const haystack =
        `${candidate.label} ${detail} ${participantNumber} ${region} ${comuna}`.toLowerCase();

      if (isNumericQuery) {
        return (
          participantNumber === normalizedQuery ||
          detail === normalizedQuery ||
          haystack.includes(normalizedQuery)
        );
      }

      return haystack.includes(normalizedQuery);
    });
  }, [uniqueCandidates, query, regionFilter]);

  const maxRandomWinnerCount = Math.max(1, filteredCandidates.length);
  const parsedRandomWinnerCount = Number.parseInt(randomWinnerCount, 10);
  const safeRandomWinnerCount = Math.min(
    Math.max(
      1,
      Number.isNaN(parsedRandomWinnerCount) ? 1 : parsedRandomWinnerCount,
    ),
    maxRandomWinnerCount,
  );

  const confirmAndSubmit = async () => {
    const form = formRef.current;
    if (!form || isPending) {
      return;
    }

    const selectedTokenList = [...selectedTokens];
    const selectedCount = selectedTokenList.length;

    const selectedReferences = selectedTokenList.map((token) => {
      const candidate = candidates.find((item) => item.token === token);
      return getParticipantReference(candidate, token);
    });
    const selectedPreview = formatParticipantReferences(selectedReferences);

    const participantLabel =
      selectedCount === 1 ? "Participante" : "Participantes";
    const participantText = `${participantLabel}: ${selectedPreview}`;
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

  const selectRandomWinners = () => {
    if (filteredCandidates.length === 0 || isPending || isRandomizing) {
      return;
    }

    setIsRandomizing(true);

    window.setTimeout(() => {
      const randomTokens = getRandomIndexes(filteredCandidates.length)
        .slice(0, safeRandomWinnerCount)
        .map((index) => filteredCandidates[index].token);

      updateSelectedTokens(new Set(randomTokens));
      setReason(
        regionFilter
          ? `Selección aleatoria de ganadores - ${regionFilter}`
          : "Selección aleatoria de ganadores",
      );
      setIsRandomizing(false);
    }, 2000);
  };

  const clearSelection = () => {
    updateSelectedTokens(new Set());
    setReason("Ganadores removidos manualmente");
  };

  return (
    <section
      key={candidateSelectionKey}
      className="mt-6 rounded-xl border border-[#DADAD6] bg-white"
    >
      <div className="flex flex-col gap-3 border-b border-[#E8E8E6] px-3 py-4 sm:px-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <LuTrophy className="size-4 text-[#A67C00]" />
            <h2 className="text-sm font-semibold text-[#000000]">
              Selección de ganadores
            </h2>
          </div>

          <p className="mt-1 text-sm text-[#000000]/55">
            Selecciona uno o más participantes para mostrar sus datos completos.
          </p>
        </div>

        <span className="w-fit shrink-0 rounded-lg border border-[#E8E8E6] px-2.5 py-1 text-xs font-medium text-[#000000]/60">
          {selectedTokens.size} seleccionados
        </span>
      </div>

      <SelectionStatus
        hasSavedWinnerSelection={hasSavedWinnerSelection}
        winnerError={winnerError}
        winnerSelection={winnerSelection}
      />

      <form
        ref={formRef}
        action={action}
        onSubmit={handleSubmit}
        aria-busy={isPending}
        className={`space-y-5 px-3 py-4 transition-opacity sm:px-4 ${
          isPending ? "pointer-events-none opacity-60" : "opacity-100"
        }`}
      >
        <input type="hidden" name="page" value={String(currentPage)} />
        <input
          type="hidden"
          name="pageSize"
          value={pageSizeValue ?? String(itemsPerPage)}
        />
        <input type="hidden" name="winnerRegionFilter" value={regionFilter} />

        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,450px)] lg:items-start">
          <WinnerCandidatesTable
            candidates={filteredCandidates}
            isPending={isPending}
            query={query}
            selectedTokens={selectedTokens}
            onCandidateChange={handleCandidateChange}
            onQueryChange={setQuery}
          />

          <RandomSelectionControls
            filteredCandidatesCount={filteredCandidates.length}
            isPending={isPending}
            isRandomizing={isRandomizing}
            maxRandomWinnerCount={maxRandomWinnerCount}
            randomWinnerCount={randomWinnerCount}
            reason={reason}
            regionFilter={regionFilter}
            regionOptions={regionOptions}
            safeRandomWinnerCount={safeRandomWinnerCount}
            onRandomWinnerCountChange={setRandomWinnerCount}
            onReasonChange={setReason}
            onRegionFilterChange={setRegionFilter}
            onSelectRandomWinners={selectRandomWinners}
          />
        </div>

        <SelectionFooter
          canSubmitSelection={canSubmitSelection}
          hasSelectionChanged={hasSelectionChanged}
          isPending={isPending}
          selectedCount={selectedTokens.size}
          onClearSelection={clearSelection}
        />
      </form>
    </section>
  );
}
