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
          <LuFilePlus2 aria-hidden="true" className="size-3.5 shrink-0 text-[#FF5C35]" />
          <span className="min-w-0 wrap-anywhere">{workspaceName}</span>
        </>
      }
      title="Crear formulario"
    />
  );
}
