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
          <LuInbox className="size-3.5 text-[#7C3AED]" />
          <span>{workspaceName}</span>
        </>
      }
      title={`Respuestas de: ${formTitle}`}
      description="Participantes que han completado el formulario."
      actions={
        <Link
          href={`/workspaces/${workspaceId}/forms/${formId}`}
          className="
            inline-flex
            items-center
            rounded-xl
            border border-[#E8E8E6]
            bg-white
            px-3 py-2
            text-sm font-medium
            text-[#000000]/70
            shadow-sm
            transition-all
            duration-200
            hover:-translate-y-0.5
            hover:border-[#7C3AED]/35
            hover:bg-[#7C3AED]/[0.04]
            hover:text-[#7C3AED]
            hover:shadow-[0_6px_16px_-8px_rgba(124,58,237,0.35)]
          "
        >
          Ver formulario
        </Link>
      }
    />
  );
}