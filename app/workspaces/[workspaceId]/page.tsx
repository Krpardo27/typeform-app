import { WorkspaceHomeActions } from "@/features/admin/workspaces/components/WorkspaceHomeActions";
import { WorkspaceHomeHeader } from "@/features/admin/workspaces/components/WorkspaceHomeHeader";
import { getWorkspaceAccessContext } from "@/features/admin/workspaces/services/workspace-access";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const { user, workspace, canCreateForms } = await getWorkspaceAccessContext(
    workspaceId,
  );

  return (
    <>
      <WorkspaceHomeHeader
        workspaceName={workspace.name}
        workspaceRole={workspace.role}
        currentUserLabel={user.name ?? user.email}
      />
      <WorkspaceHomeActions
        workspaceId={workspace.id}
        canCreateForms={canCreateForms}
      />
    </>
  );
}
