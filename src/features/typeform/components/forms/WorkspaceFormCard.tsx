import Link from "next/link";
import { LuArrowUpRight, LuCalendarClock, LuInbox } from "react-icons/lu";
import type { TypeformFormSummary } from "@/features/typeform/services/typeform.service";

type Props = {
  workspaceId: string;
  form: TypeformFormSummary;
};

function formatDate(value?: string) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function WorkspaceFormCard({ workspaceId, form }: Props) {
  const isPublic = form.settings?.is_public !== false;

  return (
    <article className="rounded-xl border border-zinc-800 bg-[#111113] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/workspaces/${workspaceId}/forms/${form.id}`}>
            <h2 className="line-clamp-2 break-words text-base font-semibold leading-snug text-white transition hover:text-[#C8A96E] sm:text-lg">
              {form.title}
            </h2>
          </Link>
          <p className="mt-1 break-all text-[11px] text-zinc-500 sm:text-xs">
            ID: {form.id}
          </p>
        </div>

        <Link
          href={`/workspaces/${workspaceId}/forms/${form.id}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition hover:border-[#C8A96E] hover:text-[#C8A96E] sm:size-9"
          aria-label={`Abrir ${form.title}`}
        >
          <LuArrowUpRight className="size-4" />
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-zinc-400 sm:mt-5">
        <span className="flex items-center gap-2">
          <LuCalendarClock className="size-4 shrink-0 text-[#C8A96E]" />
          {formatDate(form.last_updated_at)}
        </span>
        <span className="rounded-md border border-zinc-800 px-2 py-1 text-xs text-zinc-400">
          {isPublic ? "Público" : "Privado"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={`/workspaces/${workspaceId}/forms/${form.id}/responses`}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 px-2 py-1 text-xs text-zinc-400 transition hover:border-[#C8A96E] hover:text-[#C8A96E]"
        >
          <LuInbox className="size-3.5" />
          Ver respuestas
        </Link>
      </div>
    </article>
  );
}