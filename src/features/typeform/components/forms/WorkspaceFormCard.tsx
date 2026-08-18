import Link from "next/link";
import { LuArrowUpRight, LuCalendarClock, LuInbox } from "react-icons/lu";
import type { TypeformFormSummary } from "@/features/typeform/services/typeform.service";
import { CopyButton } from "@/shared/components/CopyButton";
import { WORKSPACE_EMBED_CONFIG } from "@/features/typeform/utils/embed-info";
import { WorkspaceFormDuplicateButton } from "./WorkspaceFormDuplicateButton";

type Props = {
  workspaceId: string;
  workspaceTypeformId: string;
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
  form,
  canCreateForms,
}: Props) {
  const embedConfig = WORKSPACE_EMBED_CONFIG[workspaceTypeformId];

  return (
    <article
      className="
        group
        rounded-2xl
        border border-[#E8E8E6]
        bg-white
        p-4
        shadow-[0_8px_30px_-18px_rgba(0,0,0,0.18)]
        transition-all
        duration-200
        hover:-translate-y-0.5
        hover:border-[#FF5C35]/40
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

          <div className="mt-3 flex min-w-0 flex-col items-start gap-3">
            <p className="min-w-0 w-full truncate text-sm text-[#000000]/55">
              {embedConfig ? embedConfig.buildSrc(form.id) : `ID: ${form.id}`}
            </p>

            {embedConfig ? (
              <div className="flex shrink-0 gap-1.5">
                <CopyButton
                  value={embedConfig.buildSrc(form.id)}
                  label="src"
                />
                <CopyButton
                  value={embedConfig.buildCode(form.id)}
                  label="iframe"
                />
              </div>
            ) : (
              <CopyButton value={form.id} label="" />
            )}
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
            aria-label={`Abrir ${form.title}`}
          >
            <LuArrowUpRight className="size-4" />
          </Link>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[#000000]/65">
        <span className="flex items-center gap-2">
          <LuCalendarClock className="size-4 shrink-0 text-[#7C3AED]" />
          {formatDate(form.last_updated_at)}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={`/workspaces/${workspaceId}/forms/${form.id}/responses`}
          className="
            inline-flex
            items-center
            gap-1.5
            rounded-xl
            border border-[#E8E8E6]
            bg-[#FAFAF9]
            px-2.5 py-1.5
            text-xs
            font-medium
            text-[#000000]/70
            transition-all
            hover:border-[#7C3AED]/35
            hover:bg-white
            hover:text-[#7C3AED]
          "
        >
          <LuInbox className="size-3.5" />
          Ver respuestas
        </Link>
      </div>
    </article>
  );
}