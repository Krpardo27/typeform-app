"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import Swal from "sweetalert2";
import { LuArrowUpRight, LuTrophy } from "react-icons/lu";
import { DEFAULT_WINNER_REASON } from "./constants";
import { RandomSelectionControls } from "./RandomSelectionControls";
import { SelectionFooter } from "./SelectionFooter";
import { SelectionStatus } from "./SelectionStatus";
import type { WinnerSelectionPanelProps } from "./types";
import {
  areTokenSetsEqual,
  createWinnerSelectionSnapshot,
  deduplicateWinnerCandidates,
  filterWinnerCandidates,
  formatParticipantReferences,
  getParticipantReference,
  getRandomIndexes,
  getSafeRandomWinnerCount,
} from "./utils";
import { WinnerCandidatesTable } from "./WinnerCandidatesTable";
import { WinnerDataDialog } from "./WinnerDataDialog";
import { ResponseExportButton } from "../ResponseExportButton";
import type {
  WinnerRevealGrant,
  WinnerViewParticipant,
  ReadWinnerData,
  FinishWinnerData,
} from "@/features/typeform/types/winner-reveal";

type ActiveReveal = {
  grant: WinnerRevealGrant;
  participants: WinnerViewParticipant[];
  read: ReadWinnerData;
  finish: FinishWinnerData;
  baseline: SelectionRevision;
  expectedTokens?: string;
};

type SelectionRevision = {
  scope: string;
  tokens: string;
  signature: string | null;
  version: number;
};

type ConfirmedSelection = {
  baseline: SelectionRevision;
  expectedTokens: string;
  tokens: Set<string>;
};

function tokenRevision(tokens: Iterable<string>) {
  return JSON.stringify([...new Set(tokens)].sort());
}

function isCompatibleRevision(
  current: SelectionRevision,
  baseline: SelectionRevision,
  expectedTokens?: string,
) {
  return (
    current.scope === baseline.scope &&
    ((current.version === baseline.version &&
      current.tokens === baseline.tokens &&
      current.signature === baseline.signature) ||
      (expectedTokens !== undefined &&
        baseline.tokens !== expectedTokens &&
        current.version === baseline.version + 1 &&
        current.tokens === expectedTokens))
  );
}

const RANDOM_SELECTION_COOLDOWN_MS = 800;
const confirmationClasses = {
  popup: "!rounded-md !shadow-none !border !border-[#E8E8E6]",
  confirmButton:
    "m-1 cursor-pointer rounded-md bg-[#C4513D] px-4 py-2 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C4513D]",
  cancelButton:
    "m-1 cursor-pointer rounded-md border border-[#DCDCD9] px-4 py-2 text-sm text-[#454541] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C4513D]",
};

export function WinnerSelectionPanel({
  action,
  beginWinnerData,
  readWinnerData,
  finishWinnerData,
  exportBaseHref,
  publicFormUrl,
  isFixturePreview = false,
  candidates,
  currentPage,
  initialRegionFilter,
  initialReason,
  itemsPerPage,
  pageSizeValue,
  winnerSelection,
  winnerRevision,
  winnerError,
}: WinnerSelectionPanelProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const [query, setQuery] = useState("");
  const regionContext = JSON.stringify([exportBaseHref, initialRegionFilter]);
  const [regionState, setRegionState] = useState({
    key: regionContext,
    value: initialRegionFilter ?? "",
  });
  const regionFilter =
    regionState.key === regionContext
      ? regionState.value
      : (initialRegionFilter ?? "");
  function setRegionFilter(value: string) {
    setRegionState({ key: regionContext, value });
  }
  const [randomWinnerCount, setRandomWinnerCount] = useState("1");
  const baselineReason = initialReason?.trim() || DEFAULT_WINNER_REASON;
  const [reasonState, setReasonState] = useState({
    key: baselineReason,
    value: baselineReason,
  });
  const reason =
    reasonState.key === baselineReason ? reasonState.value : baselineReason;
  function setReason(value: string) {
    setReasonState({ key: baselineReason, value });
  }
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmingRandom, setIsConfirmingRandom] = useState(false);
  const [isRandomCooldown, setIsRandomCooldown] = useState(false);
  const [selectionNotice, setSelectionNotice] = useState<{
    key: string;
    message: string;
  }>();
  const [feedback, setFeedback] = useState<string>();
  const [reveal, setReveal] = useState<ActiveReveal | null>(null);
  const [detailToken, setDetailToken] = useState<string | null>(null);
  const [isConsulting, setIsConsulting] = useState(false);
  const scope = exportBaseHref ?? "";
  const persistedTokensKey = tokenRevision(
    candidates
      .filter((candidate) => candidate.selected)
      .map((candidate) => candidate.token),
  );
  const signature = winnerRevision ?? null;
  const [knownRevision, setKnownRevision] = useState<SelectionRevision>({
    scope,
    tokens: persistedTokensKey,
    signature,
    version: 0,
  });
  // Ajuste condicional durante render: ocultar PII en este mismo render, sin
  // leer refs ni esperar a un efecto. La versión impide resucitar un grant
  // si las props pasan por una selección ajena y luego vuelven a la original.
  let revision = knownRevision;
  if (
    knownRevision.scope !== scope ||
    knownRevision.tokens !== persistedTokensKey ||
    knownRevision.signature !== signature
  ) {
    revision = {
      scope,
      tokens: persistedTokensKey,
      signature,
      version: knownRevision.version + 1,
    };
    setKnownRevision(revision);
  }
  // Este overlay no sustituye la revisión del servidor ni depende del grant.
  // Una revisión incompatible lo descarta ya en render; la versión evita
  // resucitarlo si el servidor vuelve después a las props originales.
  const [confirmedSelection, setConfirmedSelection] =
    useState<ConfirmedSelection | null>(null);
  const activeConfirmedSelection =
    confirmedSelection &&
    isCompatibleRevision(
      revision,
      confirmedSelection.baseline,
      confirmedSelection.expectedTokens,
    )
      ? confirmedSelection
      : null;
  const confirmedTokens = useMemo(
    () =>
      isFixturePreview
        ? new Set<string>()
        : (activeConfirmedSelection?.tokens ??
          new Set<string>(
            candidates
              .filter((candidate) => candidate.selected)
              .map((candidate) => candidate.token),
          )),
    [isFixturePreview, activeConfirmedSelection, candidates],
  );
  const activeReveal =
    !isFixturePreview &&
    reveal &&
    isCompatibleRevision(revision, reveal.baseline, reveal.expectedTokens)
      ? reveal
      : null;
  const activeParticipants =
    activeReveal?.participants.filter((participant) =>
      candidates.some(
        (candidate) =>
          candidate.token === participant.token && !candidate.missingResponse,
      ),
    ) ?? [];
  const viewableTokens = useMemo(
    () =>
      new Set([
        ...(activeReveal?.participants
          .filter((participant) =>
            candidates.some(
              (candidate) =>
                candidate.token === participant.token &&
                !candidate.missingResponse,
            ),
          )
          .map((participant) => participant.token) ?? []),
        ...(beginWinnerData && readWinnerData && finishWinnerData
          ? candidates
              .filter(
                (candidate) =>
                  confirmedTokens.has(candidate.token) &&
                  !candidate.missingResponse &&
                  !isFixturePreview,
              )
              .map((candidate) => candidate.token)
          : []),
      ]),
    [
      activeReveal,
      beginWinnerData,
      readWinnerData,
      finishWinnerData,
      candidates,
      confirmedTokens,
      isFixturePreview,
    ],
  );
  const [isPending, startTransition] = useTransition();
  const confirmationRef = useRef<{ valid: boolean } | null>(null);
  const consultationRef = useRef<{ valid: boolean } | null>(null);
  const savingRef = useRef<{
    valid: boolean;
    baseline: SelectionRevision;
    confirmedTokens: string;
  } | null>(null);
  const busyRef = useRef(false);
  const finishedRevealsRef = useRef(new WeakSet<ActiveReveal>());
  const randomCooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isBusy =
    isConfirming || isConfirmingRandom || isPending || isConsulting;

  function endReveal() {
    setDetailToken(null);
    setReveal(null);
  }

  useEffect(() => {
    function finishReveal(value: ActiveReveal) {
      if (finishedRevealsRef.current.has(value)) return;
      finishedRevealsRef.current.add(value);
      void value.finish(value.grant.flowToken).catch(() => {
        /* El acceso local permanece cerrado aun si la red falla. */
      });
    }
    if (!activeReveal) {
      // Un resultado puede llegar antes de que corran los efectos de una
      // revisión incompatible. Tampoco ese grant debe quedar vivo sin dueño.
      if (reveal) finishReveal(reveal);
      return;
    }
    const expire = () => {
      setReveal(null);
    };
    const timer = setTimeout(
      expire,
      Math.max(0, Date.parse(activeReveal.grant.expiresAt) - Date.now()),
    );
    const handleVisibility = () => {
      if (Date.now() >= Date.parse(activeReveal.grant.expiresAt)) expire();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
      finishReveal(activeReveal);
    };
  }, [activeReveal, reveal]);

  useEffect(() => {
    const saving = savingRef.current;
    if (
      saving &&
      !isCompatibleRevision(revision, saving.baseline, saving.confirmedTokens)
    )
      saving.valid = false;
  }, [revision]);

  const uniqueCandidates = useMemo(
    () => deduplicateWinnerCandidates(candidates),
    [candidates],
  );

  const candidateSelectionKey = JSON.stringify(uniqueCandidates);
  useEffect(
    () => () => {
      if (consultationRef.current) consultationRef.current.valid = false;
    },
    [scope, candidateSelectionKey, revision.version],
  );
  const revisionKey = JSON.stringify([
    candidateSelectionKey,
    currentPage,
    itemsPerPage,
    pageSizeValue,
    initialRegionFilter,
    baselineReason,
    revision.version,
  ]);

  useEffect(() => {
    return () => {
      if (confirmationRef.current) confirmationRef.current.valid = false;
    };
  }, [revisionKey]);

  useEffect(
    () => () => {
      if (randomCooldownRef.current !== null)
        clearTimeout(randomCooldownRef.current);
    },
    [],
  );

  const initialSelectedTokens = useMemo(
    () =>
      new Set(
        uniqueCandidates
          .filter((candidate) => candidate.selected)
          .map((candidate) => candidate.token),
      ),
    [uniqueCandidates],
  );
  const hasSavedWinnerSelection = confirmedTokens.size > 0;

  async function consultSavedWinners(
    openDetail = true,
    requestedToken?: string,
  ): Promise<string | undefined> {
    if (
      isFixturePreview ||
      !beginWinnerData ||
      !readWinnerData ||
      !finishWinnerData ||
      busyRef.current ||
      isBusy
    )
      return;
    if (activeReveal && Date.now() < Date.parse(activeReveal.grant.expiresAt)) {
      if (openDetail)
        setDetailToken(
          activeParticipants.find(
            (participant) => participant.token === requestedToken,
          )?.token ??
            activeParticipants[0]?.token ??
            null,
        );
      return activeReveal.grant.flowToken;
    }
    busyRef.current = true;
    const request = { valid: true };
    consultationRef.current = request;
    setIsConsulting(true);
    setFeedback(undefined);
    try {
      const consultation = await beginWinnerData();
      if (!mountedRef.current || !request.valid) {
        if (consultation.status === "ready")
          void finishWinnerData(consultation.grant.flowToken).catch(() => {});
        return;
      }
      if (consultation.status === "denied") {
        setFeedback(consultation.message);
        return;
      }
      const participants = consultation.participants
        .filter((participant) =>
          uniqueCandidates.some(
            (candidate) =>
              candidate.token === participant.token &&
              !candidate.missingResponse,
          ),
        )
        .map((participant) => ({
          ...participant,
          label:
            uniqueCandidates.find(
              (candidate) => candidate.token === participant.token,
            )?.label ?? participant.label,
        }));
      // begin es una lectura autorizada del conjunto guardado, no del draft.
      setConfirmedSelection({
        baseline: revision,
        expectedTokens: tokenRevision(
          consultation.participants.map(({ token }) => token),
        ),
        tokens: new Set(consultation.participants.map(({ token }) => token)),
      });
      setReveal({
        grant: consultation.grant,
        participants,
        read: readWinnerData,
        finish: finishWinnerData,
        baseline: revision,
        // Props antiguas pueden preceder a los tokens devueltos por begin.
        // Solo se admite esa primera transición si cambia el conjunto real.
        expectedTokens: tokenRevision(
          consultation.participants.map(({ token }) => token),
        ),
      });
      if (openDetail)
        setDetailToken(
          participants.find(
            (participant) => participant.token === requestedToken,
          )?.token ??
            participants[0]?.token ??
            null,
        );
      return consultation.grant.flowToken;
    } catch (error) {
      unstable_rethrow(error);
      if (mountedRef.current && request.valid)
        setFeedback(
          "No se pudieron consultar los ganadores guardados. Inténtalo de nuevo.",
        );
    } finally {
      busyRef.current = false;
      if (consultationRef.current === request) consultationRef.current = null;
      if (mountedRef.current) setIsConsulting(false);
    }
  }

  const [selectedTokenState, setSelectedTokenState] = useState<{
    key: string;
    tokens: Set<string>;
    revision: SelectionRevision;
  }>(() => ({
    key: candidateSelectionKey,
    tokens: initialSelectedTokens,
    revision,
  }));

  const preservesOwnDraft = Boolean(
    activeConfirmedSelection &&
    isCompatibleRevision(
      selectedTokenState.revision,
      activeConfirmedSelection.baseline,
      activeConfirmedSelection.expectedTokens,
    ),
  );
  const draftBaselineChanged =
    selectedTokenState.key !== candidateSelectionKey ||
    selectedTokenState.revision.version !== revision.version;
  const selectedTokens =
    !draftBaselineChanged || preservesOwnDraft
      ? selectedTokenState.tokens
      : confirmedTokens;

  if (draftBaselineChanged) {
    setSelectedTokenState({
      key: candidateSelectionKey,
      tokens: selectedTokens,
      revision,
    });
  }

  function updateSelectedTokens(
    nextTokens: Set<string> | ((current: Set<string>) => Set<string>),
  ) {
    setSelectedTokenState((currentState) => {
      const currentTokens =
        currentState.key === candidateSelectionKey || preservesOwnDraft
          ? currentState.tokens
          : confirmedTokens;

      return {
        key: candidateSelectionKey,
        revision,
        tokens:
          typeof nextTokens === "function"
            ? nextTokens(currentTokens)
            : nextTokens,
      };
    });
  }

  const hasSelectionChanged = !areTokenSetsEqual(
    selectedTokens,
    confirmedTokens,
  );
  const missingCandidates = uniqueCandidates.filter(
    (candidate) => candidate.missingResponse,
  );
  const hasSelectedMissing = missingCandidates.some((candidate) =>
    selectedTokens.has(candidate.token),
  );
  // El backend actual carga todas las respuestas enviadas. Nunca enviar una
  // selección parcial ni intentar conservar ausentes con una nueva escritura.
  const canSubmitSelection =
    hasSelectionChanged && !hasSelectedMissing && !isFixturePreview;

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

  const filteredCandidates = useMemo(
    () =>
      uniqueCandidates.filter(
        (candidate) =>
          candidate.missingResponse ||
          filterWinnerCandidates([candidate], query, regionFilter).length > 0,
      ),
    [uniqueCandidates, query, regionFilter],
  );
  const visibleSelectedCount = filteredCandidates.filter((candidate) =>
    selectedTokens.has(candidate.token),
  ).length;
  const hiddenSelectedCount = selectedTokens.size - visibleSelectedCount;

  const randomCandidates = filteredCandidates.filter(
    (candidate) => !candidate.missingResponse,
  );
  // Solo la proyección de tabla recibe las insignias confirmadas. El draft,
  // los candidatos originales y el universo del sorteo no se modifican.
  const tableCandidates = filteredCandidates.map((candidate) =>
    Boolean(candidate.selected) === confirmedTokens.has(candidate.token)
      ? candidate
      : { ...candidate, selected: confirmedTokens.has(candidate.token) },
  );
  const maxRandomWinnerCount = Math.max(1, randomCandidates.length);
  const safeRandomWinnerCount = getSafeRandomWinnerCount(
    randomWinnerCount,
    maxRandomWinnerCount,
  );

  const confirmAndSubmit = async () => {
    const form = formRef.current;
    if (!form || busyRef.current || isBusy || !canSubmitSelection) {
      return;
    }

    if (!reason.trim()) {
      setFeedback("Escribe un motivo de selección antes de confirmar.");
      form.querySelector<HTMLInputElement>('input[name="reason"]')?.focus();
      return;
    }

    // Cerrar la reentrada antes de cualquier await o actualización de React.
    busyRef.current = true;
    const confirmation = { valid: true };
    confirmationRef.current = confirmation;
    setIsConfirming(true);
    setFeedback(undefined);
    setSelectionNotice(undefined);
    const selectedTokenList = [...selectedTokens];
    const formData = createWinnerSelectionSnapshot({
      tokens: selectedTokenList,
      reason,
      region: regionFilter,
      page: currentPage,
      pageSize: pageSizeValue ?? String(itemsPerPage),
    });
    const selectedCount = selectedTokenList.length;

    const selectedReferences = selectedTokenList.map((token) => {
      const candidate = uniqueCandidates.find((item) => item.token === token);
      return getParticipantReference(candidate, token);
    });
    const selectedPreview = formatParticipantReferences(selectedReferences);

    const participantLabel =
      selectedCount === 1 ? "Participante" : "Participantes";
    const participantText = `${participantLabel}: ${selectedPreview}`;
    const isClearingWinners = selectedCount === 0;

    let submitted = false;
    try {
      const result = await Swal.fire({
        title: isClearingWinners
          ? "Quitar ganadores"
          : selectedCount === 1
            ? "Confirmar ganador"
            : "Confirmar ganadores",
        text: isClearingWinners
          ? "Se retirarán los ganadores guardados y se finalizará su consulta de datos."
          : participantText,
        icon: "question",
        iconColor: "#C4513D",
        showCancelButton: true,
        confirmButtonText: isClearingWinners
          ? "Quitar selección"
          : "Confirmar selección",
        cancelButtonText: "Cancelar",
        background: "#FFFFFF",
        color: "#000000",
        confirmButtonColor: "#C4513D",
        buttonsStyling: false,
        customClass: confirmationClasses,
      });

      if (!confirmation.valid) {
        setFeedback(
          "Los participantes cambiaron. Revisa la selección y vuelve a confirmar.",
        );
        return;
      }
      if (!result.isConfirmed) return;

      endReveal();
      submitted = true;
      const saving = {
        valid: true,
        baseline: revision,
        confirmedTokens: tokenRevision(selectedTokenList),
      };
      savingRef.current = saving;
      startTransition(async () => {
        try {
          const saved = await action(formData);
          if (!mountedRef.current || !saving.valid) {
            if (
              saved?.status === "confirmed" &&
              saved.grant &&
              finishWinnerData
            )
              void finishWinnerData(saved.grant.flowToken).catch(() => {});
            return;
          }
          if (saved?.status === "denied") setFeedback(saved.message);
          if (saved?.status === "confirmed") {
            setConfirmedSelection({
              baseline: saving.baseline,
              expectedTokens: saving.confirmedTokens,
              tokens: new Set(selectedTokenList),
            });
            if (saved.grant && readWinnerData && finishWinnerData) {
              setReveal({
                grant: saved.grant,
                read: readWinnerData,
                finish: finishWinnerData,
                baseline: saving.baseline,
                expectedTokens: saving.confirmedTokens,
                participants: selectedTokenList.map((token) => ({
                  token,
                  label:
                    uniqueCandidates.find(
                      (candidate) => candidate.token === token,
                    )?.label ?? "Ganador",
                })),
              });
            } else {
              setSelectionNotice({
                key: candidateSelectionKey,
                message:
                  saved.winnerCount === 0
                    ? "Selección retirada. No hay ganadores confirmados."
                    : "Selección guardada. Puedes consultar los ganadores sin volver a confirmarlos.",
              });
            }
          }
        } catch (error) {
          unstable_rethrow(error);
          setFeedback(
            "No se pudo guardar la selección. Revisa los datos e inténtalo de nuevo.",
          );
        } finally {
          if (savingRef.current === saving) savingRef.current = null;
          busyRef.current = false;
          confirmationRef.current = null;
          setIsConfirming(false);
        }
      });
    } catch (error) {
      unstable_rethrow(error);
      setFeedback("No se pudo confirmar la selección. Inténtalo de nuevo.");
    } finally {
      if (!submitted) {
        busyRef.current = false;
        confirmationRef.current = null;
        setIsConfirming(false);
      }
    }
  };

  const handleSubmit: NonNullable<
    React.ComponentProps<"form">["onSubmit"]
  > = async (event) => {
    event.preventDefault();

    if (busyRef.current || isBusy) {
      return;
    }

    await confirmAndSubmit();
  };

  const handleCandidateChange = (token: string, checked: boolean) => {
    if (busyRef.current || isBusy) return;
    const candidate = uniqueCandidates.find((item) => item.token === token);
    if (!candidate || (checked && candidate.missingResponse)) return;
    endReveal();
    setSelectionNotice(undefined);
    updateSelectedTokens((prev) => {
      const next = new Set(prev);
      if (checked) next.add(token);
      else next.delete(token);
      return next;
    });
  };

  const selectRandomWinners = async () => {
    if (
      randomCandidates.length === 0 ||
      busyRef.current ||
      isBusy ||
      randomCooldownRef.current !== null
    ) {
      return;
    }

    // Bloquear antes del modal y del siguiente render evita la reentrada.
    busyRef.current = true;
    const confirmation = { valid: true };
    confirmationRef.current = confirmation;

    try {
      if (selectedTokens.size > 0) {
        setIsConfirmingRandom(true);
        const result = await Swal.fire({
          titleText: "¿Reemplazar la selección actual?",
          text: `Se reemplazará toda la selección actual (${selectedTokens.size} participantes), incluidos los seleccionados fuera del filtro. La nueva selección no se guardará hasta que la confirmes.`,
          icon: "question",
          iconColor: "#C4513D",
          showCancelButton: true,
          focusCancel: true,
          confirmButtonText: "Sortear y reemplazar",
          cancelButtonText: "Conservar selección",
          background: "#FFFFFF",
          color: "#171717",
          buttonsStyling: false,
          customClass: confirmationClasses,
        });
        if (!confirmation.valid) {
          setFeedback(
            "Los participantes cambiaron. Revisa los filtros y vuelve a sortear.",
          );
          return;
        }
        if (!result.isConfirmed) return;
      }

      const randomTokens = getRandomIndexes(randomCandidates.length)
        .slice(0, safeRandomWinnerCount)
        .map((index) => randomCandidates[index].token);

      endReveal();
      updateSelectedTokens(new Set(randomTokens));
      setReason(
        regionFilter
          ? `Selección aleatoria de ganadores - ${regionFilter}`
          : "Selección aleatoria de ganadores",
      );
      setFeedback(undefined);
      setSelectionNotice({
        key: candidateSelectionKey,
        message:
          randomTokens.length === 1
            ? "Se seleccionó 1 participante. Revisa y confirma para guardar."
            : `Se seleccionaron ${randomTokens.length} participantes. Revisa y confirma para guardar.`,
      });
      setIsRandomCooldown(true);
      randomCooldownRef.current = setTimeout(() => {
        randomCooldownRef.current = null;
        setIsRandomCooldown(false);
      }, RANDOM_SELECTION_COOLDOWN_MS);
    } catch {
      setFeedback(
        "No se pudo realizar el sorteo seguro. La selección anterior se conserva.",
      );
    } finally {
      busyRef.current = false;
      confirmationRef.current = null;
      setIsConfirmingRandom(false);
    }
  };

  const clearSelection = () => {
    if (busyRef.current || isBusy) return;
    endReveal();
    setSelectionNotice(undefined);
    updateSelectedTokens(new Set());
    setReason("Ganadores removidos manualmente");
  };

  return (
    <section className="mt-6 min-w-0 rounded-md border border-[#E8E8E6] bg-white text-[#171717]">
      <div className="flex flex-col gap-3 border-b border-[#E8E8E6] px-3 py-4 sm:px-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <LuTrophy className="size-4 text-[#C4513D]" aria-hidden="true" />
            <h2 className="text-base font-semibold text-[#171717]">
              Selección de ganadores
            </h2>
          </div>

          <p className="mt-1 text-sm text-[#000000]/55">
            Selecciona y confirma para consultar los datos completos. La tabla
            identifica a cada participante por su número.
          </p>
        </div>

        <span
          className="w-fit shrink-0 rounded-md border border-[#E8E8E6] px-2.5 py-1 text-sm font-medium text-[#000000]/60"
          aria-live="polite"
        >
          {selectedTokens.size} seleccionados en total · {hiddenSelectedCount}{" "}
          fuera del filtro
        </span>
      </div>

      {isFixturePreview && (
        <p
          role="status"
          className="mx-3 mt-4 rounded-md border border-[#D1D1CD] bg-[#FAFAF9] px-3 py-2 text-sm leading-6 text-[#595954] sm:mx-4"
        >
          Prueba local con participantes ficticios. Puedes filtrar y sortear; el
          guardado de ganadores está desactivado. No se envían respuestas a
          Typeform ni se modifican ganadores reales.
        </p>
      )}

      <SelectionStatus
        hasSavedWinnerSelection={hasSavedWinnerSelection}
        winnerError={winnerError}
        winnerSelection={winnerSelection}
        feedback={feedback}
        selectionNotice={
          selectionNotice?.key === candidateSelectionKey
            ? selectionNotice.message
            : undefined
        }
      />

      {missingCandidates.length > 0 && (
        <p
          role="alert"
          className="border-b border-[#E8E8E6] px-3 py-3 text-sm leading-6 text-[#A33116] sm:px-4"
        >
          Hay ganadores guardados cuya respuesta no está disponible. No se han
          retirado automáticamente. Retira los ausentes antes de confirmar
          cambios. Puedes desmarcarlos o limpiar la selección; la retirada solo
          se guardará tras tu confirmación. Estas filas permanecen visibles
          aunque filtres por región o búsqueda.
        </p>
      )}

      {exportBaseHref && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[#E8E8E6] px-3 py-3 sm:px-4">
          <ResponseExportButton
            baseHref={exportBaseHref}
            scope="participants"
            label="Exportar participantes"
            variant="participants"
            canExport
          />
          <ResponseExportButton
            baseHref={exportBaseHref}
            scope="winners"
            label="Exportar ganadores"
            variant="winners"
            canExport={
              !isBusy && (hasSavedWinnerSelection || Boolean(activeReveal))
            }
            winnerFlowToken={activeReveal?.grant.flowToken}
            requestWinnerFlowToken={
              beginWinnerData ? () => consultSavedWinners(false) : undefined
            }
            disabledMessage="Confirma al menos un ganador para exportar"
            disabledDescription="Solo se exportan los ganadores guardados, no los cambios pendientes."
          />
          {publicFormUrl && (
            <a
              href={publicFormUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abrir formulario en una nueva pestaña"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-[#D1D1CD] bg-white px-3 py-2 text-sm font-medium text-[#595954] transition-colors hover:border-[#FF5C35]/60 hover:text-[#A53318] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35] motion-reduce:transition-none"
            >
              Abrir formulario
              <LuArrowUpRight
                aria-hidden="true"
                className="size-3.5 shrink-0"
              />
            </a>
          )}
        </div>
      )}

      {hasSavedWinnerSelection && beginWinnerData && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8E8E6] px-3 py-3 sm:px-4">
          <p className="text-sm text-[#595954]">
            {confirmedTokens.size} ganadores guardados.
          </p>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => consultSavedWinners()}
            className="min-h-11 cursor-pointer rounded-md border border-[#A33116] px-3 text-sm font-medium text-[#A33116] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A33116] disabled:opacity-50"
          >
            {isConsulting ? "Consultando…" : "Consultar ganadores guardados"}
          </button>
        </div>
      )}

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        aria-busy={isBusy}
        className="space-y-5 px-3 py-4 sm:px-4"
      >
        <input type="hidden" name="page" value={String(currentPage)} />
        <input
          type="hidden"
          name="pageSize"
          value={pageSizeValue ?? String(itemsPerPage)}
        />
        <input type="hidden" name="winnerRegionFilter" value={regionFilter} />

        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] xl:items-start">
          <WinnerCandidatesTable
            candidates={tableCandidates}
            confirmedSelectionKey={tokenRevision(confirmedTokens)}
            isPending={isBusy}
            query={query}
            selectedTokens={selectedTokens}
            onCandidateChange={handleCandidateChange}
            onQueryChange={setQuery}
            viewableTokens={viewableTokens}
            onViewCandidate={
              readWinnerData && finishWinnerData
                ? (token) => {
                    if (!viewableTokens.has(token) || busyRef.current || isBusy)
                      return;
                    if (
                      activeReveal?.participants.some(
                        (participant) => participant.token === token,
                      ) &&
                      Date.now() < Date.parse(activeReveal.grant.expiresAt)
                    )
                      setDetailToken(token);
                    else void consultSavedWinners(true, token);
                  }
                : undefined
            }
          />

          <RandomSelectionControls
            filteredCandidatesCount={randomCandidates.length}
            isPending={isBusy}
            maxRandomWinnerCount={maxRandomWinnerCount}
            isRandomCooldown={isRandomCooldown}
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
          isPending={isBusy}
          isConfirming={(isConfirming || isConfirmingRandom) && !isPending}
          selectedCount={selectedTokens.size}
          hiddenSelectedCount={hiddenSelectedCount}
          disabledReason={
            isFixturePreview
              ? "Modo prueba local: el guardado está desactivado para no crear ganadores ficticios en la base real."
              : hasSelectedMissing
                ? "Retira los ganadores con respuesta no disponible antes de confirmar los cambios."
                : undefined
          }
          onClearSelection={clearSelection}
        />
        {activeReveal && activeParticipants.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E8E8E6] pt-4">
            <p role="status" className="text-sm leading-6 text-[#595954]">
              Consulta autorizada de ganadores · dos minutos. Cerrar el detalle
              no cambia la selección.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDetailToken(activeParticipants[0].token)}
                className="min-h-11 cursor-pointer rounded-md border border-[#A33116] px-3 text-sm font-medium text-[#A33116] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A33116]"
              >
                Ver datos de ganadores
              </button>
              <button
                type="button"
                onClick={endReveal}
                className="min-h-11 cursor-pointer rounded-md px-3 text-sm text-[#595954] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A33116]"
              >
                Finalizar consulta
              </button>
            </div>
          </div>
        )}
      </form>
      {detailToken && activeReveal && viewableTokens.has(detailToken) && (
        <WinnerDataDialog
          key={`winners:${detailToken}`}
          grant={activeReveal.grant}
          participants={activeParticipants}
          initialToken={detailToken}
          readData={activeReveal.read}
          onClose={() => setDetailToken(null)}
          selectionFormRef={formRef}
          exportBaseHref={exportBaseHref}
        />
      )}
    </section>
  );
}
