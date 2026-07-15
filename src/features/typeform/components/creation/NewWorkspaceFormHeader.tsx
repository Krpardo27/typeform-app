import { LuFilePlus2 } from "react-icons/lu";
import { WorkspaceHeader } from "@/features/admin/workspaces/components/WorkspaceHeader";

type Props = {
  workspaceId: string;
  workspaceName: string;
};

export function NewWorkspaceFormHeader({ workspaceId, workspaceName }: Props) {
  return (
    <WorkspaceHeader
      backHref={`/workspaces/${workspaceId}/forms`}
      backLabel="Volver a formularios"
      eyebrow={
        <>
          <LuFilePlus2 className="size-3.5 text-[#C8A96E]" />
          <span className="truncate">{workspaceName}</span>
        </>
      }
      title="Crear formulario"
      description="Puedes usar cualquier formulario como base para crear una nueva version."
    />
  );
}
