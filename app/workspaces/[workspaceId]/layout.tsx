import { ReactNode } from "react";
import { WorkspaceShellFrame } from "@/features/admin/workspaces/components/WorkspaceShellFrame";
import { getWorkspaceAccessContext } from "@/features/admin/workspaces/services/workspace-access";

export default async function WorkspaceSegmentLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const { user, workspaces, workspace } = await getWorkspaceAccessContext(workspaceId);

  return (
    <WorkspaceShellFrame
      user={user}
      workspaces={workspaces}
      currentWorkspaceId={workspace.id}
    >
      {children}
    </WorkspaceShellFrame>
  );
}