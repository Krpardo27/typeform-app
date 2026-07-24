import { LuCalendarClock, LuEyeOff } from "react-icons/lu";
import Pagination from "@/shared/components/Pagination";
import type { MaskedTypeformResponse } from "@/features/typeform/services/typeform.service";

type WorkspaceFormResponsesListProps = {
  responses: MaskedTypeformResponse[];
  revealedWinnerTokens: Set<string>;
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

export function WorkspaceFormResponsesList({
  responses,
  revealedWinnerTokens,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
}: WorkspaceFormResponsesListProps) {
  return (
    <section className="mt-8 space-y-4">
      <Pagination
        currentPage={Math.min(currentPage, Math.max(1, totalPages))}
        totalPages={Math.max(1, totalPages)}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        itemLabel="participantes"
        showPageSizeSelector
      />

      {responses.map((response) => (
        <article
          key={response.token}
          className="rounded-xl border border-zinc-800 bg-[#111113] p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800 pb-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                Participante {response.token}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
                <span className="inline-flex items-center gap-1.5">
                  <LuCalendarClock className="size-3.5" />
                  Enviado: {formatDate(response.submittedAt)}
                </span>
                <span>Llegada: {formatDate(response.landedAt)}</span>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 px-2 py-1 text-xs text-zinc-400">
              <LuEyeOff className="size-3.5 text-[#C8A96E]" />
              {revealedWinnerTokens.has(response.token)
                ? "Ganador visible por seleccion"
                : "Datos sensibles ocultos"}
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {[...response.answers, ...response.hidden].map((answer) => (
              <div
                key={`${response.token}-${answer.id}`}
                className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                    {answer.question}
                  </p>
                  {answer.masked && (
                    <LuEyeOff className="size-3.5 shrink-0 text-[#C8A96E]" />
                  )}
                </div>
                <p className="mt-2 wrap-break-word text-sm text-zinc-200">
                  {answer.value}
                </p>
              </div>
            ))}
          </div>
        </article>
      ))}

      <Pagination
        currentPage={Math.min(currentPage, Math.max(1, totalPages))}
        totalPages={Math.max(1, totalPages)}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        itemLabel="participantes"
        showPageSizeSelector
      />
    </section>
  );
}
