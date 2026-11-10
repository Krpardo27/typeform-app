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
          <LuInbox
            aria-hidden="true"
            className="size-3.5 shrink-0 text-[#FF5C35]"
          />
          <span className="min-w-0 wrap-anywhere">{workspaceName}</span>
        </>
      }
      title={`Respuestas de: ${formTitle}`}
    />
  );
}
