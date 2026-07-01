"use client";

import Swal from "sweetalert2";
import { LuTrophy } from "react-icons/lu";

type WinnerCandidate = {
  token: string;
  label: string;
  detail?: string;
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
  const handleSubmit: NonNullable<React.ComponentProps<"form">["onSubmit"]> =
    async (event) => {
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
          background: "#111113",
          color: "#f4f4f5",
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
        background: "#111113",
        color: "#f4f4f5",
        confirmButtonColor: "#10b981",
      });

      if (!result.isConfirmed) {
        return;
      }

      if (!reasonInput?.value.trim()) {
        reasonInput?.focus();
        return;
      }

      form.submit();
    };

  return (
    <section className="mt-6 rounded-xl border border-emerald-400/40 bg-emerald-950/20 p-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-emerald-300">
        <LuTrophy className="size-3.5" />
        <span>Selección de ganadores</span>
      </div>

      <h2 className="mt-2 text-base font-semibold text-white">
        Elige uno o más participantes
      </h2>
      <p className="mt-1 text-sm text-zinc-400">
        Solo en este flujo se mostrarán datos completos de los participantes seleccionados.
      </p>

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

      <form action={action} onSubmit={handleSubmit} className="mt-4 space-y-4">
        <input type="hidden" name="page" value={String(currentPage)} />
        <input type="hidden" name="pageSize" value={String(itemsPerPage)} />

        <div className="grid gap-2 md:grid-cols-2">
          {candidates.map((candidate) => (
            <label
              key={`winner-${candidate.token}`}
              className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300"
            >
              <input
                type="checkbox"
                name="winnerToken"
                value={candidate.token}
                defaultChecked={candidate.selected}
                className="size-4 accent-emerald-400"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{candidate.label}</span>
                {candidate.detail && (
                  <span className="block truncate text-xs text-zinc-500">
                    {candidate.detail}
                  </span>
                )}
              </span>
            </label>
          ))}
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
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-emerald-400"
          />
        </label>

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300"
        >
          <LuTrophy className="size-4" />
          Confirmar ganadores
        </button>
      </form>
    </section>
  );
}
