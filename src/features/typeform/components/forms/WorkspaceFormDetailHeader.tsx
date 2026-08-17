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
          <LuFileText className="size-3.5 text-[#FF5C35]" />
          <span>{workspaceName}</span>
        </>
      }
      title={formTitle}
      description="Formulario autorizado"
      actions={
        <>
          <Link
            href={`/workspaces/${workspaceId}/forms/${formId}/responses`}
            className="inline-flex items-center gap-2 rounded-lg border border-[#7C3AED]/35 bg-[#7C3AED]/7 px-3 py-2 text-sm text-[#7C3AED] transition-colors hover:border-[#7C3AED]/22 hover:bg-[#7C3AED]/4 hover:text-[#7C3AED]/80"
          >
            Ver respuestas
            <LuInbox className="size-4" />
          </Link>

          {displayUrl && (
            <a
              href={displayUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-[#FF5C35]/35 bg-[#FF5C35]/7 px-3 py-2 text-sm text-[#FF5C35] transition-colors hover:border-[#FF5C35]/22 hover:bg-[#FF5C35]/4 hover:text-[#FF5C35]/80"
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
