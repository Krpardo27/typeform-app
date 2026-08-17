"use client";

import { useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { LuSearch, LuTrophy } from "react-icons/lu";

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
  winnerSelection?: string;
  winnerError?: string;
};

export function WinnerSelectionPanel({
  action,
  candidates,
  currentPage,
  itemsPerPage,
  winnerSelection,
  winnerError,
}: WinnerSelectionPanelProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const submitConfirmedRef = useRef(false);
  const [query, setQuery] = useState("");
  const [selectedTokens, setSelectedTokens] = useState<Set<string>>(
    () =>
      new Set(
        candidates
          .filter((candidate) => candidate.selected)
          .map((candidate) => candidate.token),
      ),
  );

  const filteredCandidates = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) return candidates;

    const normalizedQuery = normalized.replace(/^#/, "");
    const isNumericQuery = /^\d+$/.test(normalizedQuery);

    if (isNumericQuery) {
      return candidates.filter((candidate) => {
        const participantNumber = String(candidate.participantNumber ?? "")
          .replace(/^#/, "")
          .trim()
          .toLowerCase();

        return participantNumber === normalizedQuery;
      });
    }

    return candidates.filter((candidate) => {
      const participantNumber = String(candidate.participantNumber ?? "")
        .replace(/^#/, "")
        .toLowerCase();
      const haystack = `${candidate.label} ${candidate.token} ${participantNumber}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [candidates, query]);

  const handleSubmit: NonNullable<React.ComponentProps<"form">["onSubmit"]> =
    async (event) => {
      if (submitConfirmedRef.current) {
        submitConfirmedRef.current = false;
        return;
      }

      event.preventDefault();

      const form = event.currentTarget;
      const selectedInputs = Array.from(
        form.querySelectorAll<HTMLInputElement>('input[name="winnerToken"]:checked'),
      );
      const reasonInput = form.querySelector<HTMLInputElement>('input[name="reason"]');
      const selectedCount = selectedInputs.length;

      if (selectedCount === 0) {
        await Swal.fire({
          title: "Sin selección",
          text: "Debes seleccionar al menos un participante para continuar.",
          icon: "warning",
          background: "#FFFFFF",
          color: "#000000",
          confirmButtonColor: "#10b981",
        });
        return;
      }

      const selectedPreview = selectedInputs
        .slice(0, 3)
        .map((input) => {
          const candidate = candidates.find((item) => item.token === input.value);
          return candidate?.label ?? input.value;
        })
        .join("\n");

      const hasMore = selectedCount > 3;

      const result = await Swal.fire({
        title: "Confirmar ganadores",
        text: hasMore
          ? `${selectedPreview}\n... y ${selectedCount - 3} participante(s) más.`
          : selectedPreview,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Confirmar selección",
        cancelButtonText: "Cancelar",
        background: "#FFFFFF",
        color: "#000000",
        confirmButtonColor: "#10b981",
      });

      if (!result.isConfirmed) {
        return;
      }

      if (!reasonInput?.value.trim()) {
        reasonInput?.focus();
        return;
      }

      submitConfirmedRef.current = true;
      formRef.current?.requestSubmit();
    };

  const handleCandidateChange = (token: string, checked: boolean) => {
    setSelectedTokens((prev) => {
      const next = new Set(prev);
      if (checked) next.add(token);
      else next.delete(token);
      return next;
    });
  };

  return (
    <section className="mt-6 rounded-xl border border-[#00BFA5]/30 bg-[#00BFA5]/8 p-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#00BFA5]">
        <LuTrophy className="size-3.5" />
        <span>Selección de ganadores</span>
      </div>

      <div className="mt-3 flex flex-col gap-3 rounded-xl border border-[#00BFA5]/20 bg-[#FFFFFF] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#000000]">
            Elige uno o más participantes
          </h2>
          <p className="mt-1 text-sm text-[#000000]/60">
            Solo en este flujo se mostrarán datos completos de los participantes seleccionados.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-[#00BFA5]/20 bg-[#00BFA5]/8 px-2.5 py-1.5 text-xs font-medium text-[#00BFA5]">
          <LuTrophy className="size-3.5" />
          {selectedTokens.size} seleccionados
        </div>
      </div>

      {winnerSelection === "1" && (
        <p className="mt-3 text-sm text-emerald-400">
          Ganadores seleccionados. La data completa solo está visible para los elegidos.
        </p>
      )}

      {winnerError === "empty" && (
        <p className="mt-3 text-sm text-amber-400">
          Debes seleccionar al menos un participante para continuar.
        </p>
      )}

      {winnerError === "forbidden" && (
        <p className="mt-3 text-sm text-rose-400">
          No tienes permisos para seleccionar ganadores en este formulario.
        </p>
      )}

      <form
        ref={formRef}
        action={action}
        onSubmit={handleSubmit}
        className="mt-4 space-y-4"
      >
        <input type="hidden" name="page" value={String(currentPage)} />
        <input type="hidden" name="pageSize" value={String(itemsPerPage)} />

        <label className="relative block">
          <span className="sr-only">Buscar participante</span>
          <LuSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#000000]/40" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre, token o # participante"
            className="w-full rounded-xl border border-[#F5F5F5] bg-[#FFFFFF] py-2.5 pl-10 pr-3 text-sm text-[#000000] placeholder:text-[#000000]/40 outline-none transition focus:border-[#00BFA5]"
          />
        </label>

        <div className="grid gap-2 md:grid-cols-2">
          {filteredCandidates.length === 0 ? (
            <div className="md:col-span-2 rounded-xl border border-dashed border-[#F5F5F5] bg-[#FFFFFF] px-3 py-5 text-center text-sm text-[#000000]/55">
              No hay participantes que coincidan con tu búsqueda.
            </div>
          ) : (
            filteredCandidates.map((candidate) => (
              <label
                key={`winner-${candidate.token}`}
                className="flex items-center gap-2 rounded-lg border border-[#F5F5F5] bg-[#FFFFFF] px-3 py-2 text-sm text-[#000000]/75"
              >
                <input
                  type="checkbox"
                  name="winnerToken"
                  value={candidate.token}
                  checked={selectedTokens.has(candidate.token)}
                  onChange={(event) => {
                    handleCandidateChange(candidate.token, event.target.checked);
                  }}
                  className="size-4 accent-[#00BFA5]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{candidate.label}</span>
                  {candidate.detail && (
                    <span className="block truncate text-xs text-[#000000]/50">
                      {candidate.detail}
                    </span>
                  )}
                </span>
              </label>
            ))
          )}
        </div>

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">
            Motivo de selección
          </span>
          <input
            type="text"
            name="reason"
            defaultValue="Selección manual de ganadores"
            required
            className="w-full rounded-lg border border-[#F5F5F5] bg-[#FFFFFF] px-3 py-2 text-sm text-[#000000] outline-none transition focus:border-[#00BFA5]"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#00BFA5] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <LuTrophy className="size-4" />
            Confirmar ganadores
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedTokens(new Set());
              const inputs = Array.from(
                document.querySelectorAll<HTMLInputElement>('input[name="winnerToken"]'),
              );
              inputs.forEach((input) => {
                input.checked = false;
              });
            }}
            className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#F5F5F5] bg-[#FFFFFF] px-4 py-2 text-sm font-medium text-[#000000]/70 transition hover:border-[#000000]/15 hover:text-[#000000]"
          >
            Limpiar selección
          </button>
        </div>
      </form>
    </section>
  );
}
