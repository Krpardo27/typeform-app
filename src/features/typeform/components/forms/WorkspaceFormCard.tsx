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
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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
  const publicFormUrl = form._links?.display ?? embedSrc;

  return (
    <article
      className="
    group
    rounded-2xl
    border border-[#D1D1CD]
    bg-white
    p-4
    shadow-[0_8px_30px_-18px_rgba(0,0,0,0.18)]
    transition-all
    duration-200
    hover:-translate-y-0.5
    hover:border-[#FF5C35]/50
    hover:shadow-[0_14px_35px_-18px_rgba(0,0,0,0.22)]
    sm:p-5
  "
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link href={`/workspaces/${workspaceId}/forms/${form.id}`}>
            <h2
              className="
                line-clamp-2
                wrap-break-word
                text-base
                font-semibold
                leading-snug
                text-[#111111]
                transition-colors
                hover:text-[#FF5C35]
                sm:text-lg
              "
            >
              {form.title}
            </h2>
          </Link>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#000000]/50">
            <span className="rounded-lg border border-[#E8E8E6] bg-[#FAFAF9] px-2 py-1 font-mono text-[11px] text-[#000000]/60">
              ID: {form.id}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          {canCreateForms && (
            <WorkspaceFormDuplicateButton
              workspaceId={workspaceId}
              formId={form.id}
              formTitle={form.title}
            />
          )}

          {publicFormUrl ? (
            <a
              href={publicFormUrl}
              target="_blank"
              rel="noreferrer"
              className="
              flex size-11 shrink-0 items-center justify-center
              rounded-xl
              border border-[#E8E8E6]
              bg-[#F7F7F6]
              text-[#000000]/60
              transition-all
              hover:border-[#FF5C35]/30
              hover:bg-white
              hover:text-[#FF5C35]
              sm:size-9
            "
              aria-label={`Abrir formulario ${form.title}`}
            >
              <LuArrowUpRight className="size-4" />
            </a>
          ) : (
            <Link
              href={`/workspaces/${workspaceId}/forms/${form.id}`}
              className="
              flex size-11 shrink-0 items-center justify-center
              rounded-xl
              border border-[#E8E8E6]
              bg-[#F7F7F6]
              text-[#000000]/60
              transition-all
              hover:border-[#FF5C35]/30
              hover:bg-white
              hover:text-[#FF5C35]
              sm:size-9
            "
              aria-label={`Abrir detalle de ${form.title}`}
            >
              <LuArrowUpRight className="size-4" />
            </Link>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[#000000]/65">
        <span className="flex items-center gap-2">
          <LuCalendarClock className="size-4 shrink-0 text-[#7C3AED]" />
          {formatDate(form.last_updated_at)}
        </span>
      </div>

      <div className="mt-5 flex min-w-0 flex-col gap-2 border-t border-[#F0F0EE] pt-4">
        <Link
          href={`/workspaces/${workspaceId}/forms/${form.id}/responses`}
          className="
    group/responses
    inline-flex
    w-full
    items-center
    justify-center
    gap-2
    rounded-lg
    border border-[#E8E8E6]
    bg-[#FAFAF9]
    px-3
    py-2
    text-xs
    font-medium
    text-[#18181B]
    transition-all
    hover:border-[#FF5C35]/25
    hover:bg-[#FFF7F4]
    hover:text-[#FF5C35]
  "
        >
          <span>Ver respuestas</span>
          <LuArrowUpRight
            className="
      size-3.5
      text-[#A1A1AA]
      transition-colors
      group-hover/responses:text-[#FF5C35]
    "
          />
        </Link>

        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {embedSrc ? (
            <>
              <CopyButton value={embedSrc} label="src" />
              <CopyButton value={embedInfo.code} label="iframe" />
            </>
          ) : (
            <CopyButton value={form.id} label="ID" />
          )}
        </div>
      </div>
    </article>
  );
}
