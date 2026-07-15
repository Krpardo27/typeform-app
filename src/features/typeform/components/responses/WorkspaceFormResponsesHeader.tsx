import Link from "next/link";
import { LuInbox } from "react-icons/lu";
import { WorkspaceHeader } from "@/features/admin/workspaces/components/WorkspaceHeader";

type WorkspaceFormResponsesHeaderProps = {
  workspaceId: string;
  workspaceName: string;
  formId: string;
  formTitle: string;
};

export function WorkspaceFormResponsesHeader({
  workspaceId,
  workspaceName,
  formId,
  formTitle,
}: WorkspaceFormResponsesHeaderProps) {
  return (
    <WorkspaceHeader
      backHref={`/workspaces/${workspaceId}/forms`}
      backLabel="Volver a formularios"
      eyebrow={
        <>
          <LuInbox className="size-3.5 text-[#C8A96E]" />
          <span>{workspaceName}</span>
        </>
      }
      title={`Respuestas de ${formTitle}`}
      description="Participantes recuperados desde Typeform con datos sensibles enmascarados."
      actions={
        <Link
          href={`/workspaces/${workspaceId}/forms/${formId}`}
          className="inline-flex items-center rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 transition hover:border-[#C8A96E] hover:text-[#C8A96E]"
        >
          Ver formulario
        </Link>
      }
    />
  );
}
