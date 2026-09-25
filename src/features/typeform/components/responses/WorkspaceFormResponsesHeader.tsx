import { LuInbox } from "react-icons/lu";
import { WorkspaceHeader } from "@/features/admin/workspaces/components/WorkspaceHeader";

type WorkspaceFormResponsesHeaderProps = {
  workspaceId: string;
  workspaceName: string;
  formTitle: string;
};

export function WorkspaceFormResponsesHeader({
  workspaceId,
  workspaceName,
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
    />
  );
}