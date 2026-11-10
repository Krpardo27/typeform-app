import Link from "next/link";
import { LuArrowUpRight, LuCalendarClock } from "react-icons/lu";
import type { TypeformFormSummary } from "@/features/typeform/services/typeform.service";
import { CopyButton } from "@/shared/components/CopyButton";
import { getEmbedInfo } from "@/features/typeform/utils/embed-info";
import { WorkspaceFormDuplicateButton } from "./WorkspaceFormDuplicateButton";

type Props = {
  workspaceId: string;
  workspaceTypeformId: string;
  templateFormTypeformId?: string | null;
  form: TypeformFormSummary;
  canCreateForms: boolean;
};

function formatDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;

  return {
    dateTime: date.toISOString(),
    label: new Intl.DateTimeFormat("es-CL", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(date),
  };
}

export function WorkspaceFormCard({
  workspaceId,
  workspaceTypeformId,
  templateFormTypeformId,
  form,
  canCreateForms,
}: Props) {
  const embedInfo = getEmbedInfo(
    form.id,
    workspaceTypeformId,
    undefined,
    templateFormTypeformId,
  );
  const embedSrc = embedInfo.src;
  const publicFormUrl = embedInfo.publicUrl ?? form._links?.display ?? embedSrc;
  const title = form.title?.trim() || "Formulario sin título";
  const updatedAt = formatDate(form.last_updated_at);
  const responsesHref = `/workspaces/${encodeURIComponent(workspaceId)}/forms/${encodeURIComponent(form.id)}/responses`;

  return (
    <article className="flex h-full min-w-0 flex-col rounded-md border border-[#FF5C35]/30 bg-white p-4 text-[#171717] transition-colors hover:border-[#FF5C35]/60 focus-within:border-[#FF5C35] motion-reduce:transition-none sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link href={responsesHref} className="rounded-sm text-[#171717] underline-offset-4 hover:text-[#A53318] hover:underline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#FF5C35]">
            <h2 className="text-base leading-snug font-semibold wrap-anywhere sm:text-lg">
              {title}
            </h2>
          </Link>

          <p className="mt-2 text-sm leading-5 text-[#595954] tabular-nums wrap-anywhere">ID: {form.id}</p>
        </div>

          {canCreateForms && (
            <WorkspaceFormDuplicateButton
              workspaceId={workspaceId}
              formId={form.id}
              formTitle={title}
            />
          )}
      </div>

      <p className="mt-4 flex items-center gap-2 text-sm leading-5 text-[#595954]">
        <LuCalendarClock aria-hidden="true" className="size-4 shrink-0" />
        {updatedAt ? (
          <span>
            Actualizado <time dateTime={updatedAt.dateTime} className="tabular-nums">{updatedAt.label} UTC</time>
          </span>
        ) : (
          <span>Sin fecha informada</span>
        )}
      </p>

      <div className="mt-auto pt-5">
        <div className="flex min-w-0 flex-col gap-3 border-t border-[#E8E8E6] pt-4">
          <Link
            href={responsesHref}
            aria-label={`Ver respuestas de ${title}`}
            className="inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-md border border-[#FF5C35]/35 bg-[#FFF8F5] px-3 py-3 text-sm font-medium text-[#A53318] transition-colors hover:border-[#FF5C35] hover:bg-[#FFF1EC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35] motion-reduce:transition-none"
          >
            Ver respuestas
            <LuArrowUpRight aria-hidden="true" className="size-4 shrink-0" />
          </Link>

          {publicFormUrl && (
            <a href={publicFormUrl} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${title} en una nueva pestaña`} className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-sm text-sm font-medium text-[#595954] underline-offset-4 hover:text-[#A53318] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35]">
              Abrir formulario<LuArrowUpRight aria-hidden="true" className="size-3.5 shrink-0" />
            </a>
          )}

          <div role="group" aria-label={`Copiar datos de ${title}`} className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#E8E8E6] pt-1">
            {embedSrc ? (
              <><CopyButton value={embedSrc} label="Copiar src" variant="subtle" /><CopyButton value={embedInfo.code} label="Copiar iframe" variant="subtle" /></>
            ) : <CopyButton value={form.id} label="Copiar ID" variant="subtle" />}
          </div>
        </div>
      </div>
    </article>
  );
}
