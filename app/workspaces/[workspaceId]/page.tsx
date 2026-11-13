import { WorkspaceHomeActions } from "@/features/admin/workspaces/components/WorkspaceHomeActions";
import { WorkspaceHomeHeader } from "@/features/admin/workspaces/components/WorkspaceHomeHeader";
import { getWorkspaceRenderContext } from "@/features/admin/workspaces/services/workspace-access";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const { workspace, canCreateForms } =
    await getWorkspaceRenderContext(workspaceId);
  return (
    <>
      <WorkspaceHomeHeader
        workspaceName={workspace.name}
        workspaceRole={workspace.role}
      />
      <WorkspaceHomeActions
        workspaceId={workspace.id}
        canCreateForms={canCreateForms}
      />
    </>
  );
}
