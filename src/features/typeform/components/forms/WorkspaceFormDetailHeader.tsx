import Link from "next/link";
import { LuExternalLink, LuFileText, LuInbox } from "react-icons/lu";
import { WorkspaceHeader } from "@/features/admin/workspaces/components/WorkspaceHeader";

type WorkspaceFormDetailHeaderProps = {
  workspaceId: string;
  workspaceName: string;
  formId: string;
  formTitle: string;
  displayUrl?: string;
};

export function WorkspaceFormDetailHeader({
  workspaceId,
  workspaceName,
  formId,
  formTitle,
  displayUrl,
}: WorkspaceFormDetailHeaderProps) {
  return (
    <WorkspaceHeader
      backHref={`/workspaces/${workspaceId}/forms`}
      backLabel="Volver a formularios"
      eyebrow={
        <>
          <LuFileText className="size-3.5 text-[#C8A96E]" />
          <span>{workspaceName}</span>
        </>
      }
      title={formTitle}
      description="Formulario autorizado"
      actions={
        <>
          <Link
            href={`/workspaces/${workspaceId}/forms/${formId}/responses`}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 transition hover:border-[#C8A96E] hover:text-[#C8A96E]"
          >
            Ver respuestas
            <LuInbox className="size-4" />
          </Link>

          {displayUrl && (
            <a
              href={displayUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 transition hover:border-[#C8A96E] hover:text-[#C8A96E]"
            >
              Abrir Typeform
              <LuExternalLink className="size-4" />
            </a>
          )}
        </>
      }
    />
  );
}
