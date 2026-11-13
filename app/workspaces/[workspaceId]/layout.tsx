import { ReactNode } from "react";
import type { Metadata } from "next";
import { WorkspaceShellFrame } from "@/features/admin/workspaces/components/WorkspaceShellFrame";
import { getWorkspaceRenderContext } from "@/features/admin/workspaces/services/workspace-access";

type Props = {
  children: ReactNode;
  params: Promise<{ workspaceId: string }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}): Promise<Metadata> {
  const { workspaceId } = await params;

  const { workspace } = await getWorkspaceRenderContext(workspaceId);

  return {
    title: workspace?.name ?? "Workspace",
  };
}

export default async function WorkspaceSegmentLayout({
  children,
  params,
}: Props) {
  const { workspaceId } = await params;
  const { user, workspaces, workspace } = await getWorkspaceRenderContext(workspaceId);

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