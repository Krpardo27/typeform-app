"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { WorkspaceShell } from "./WorkspaceShell";

type WorkspaceShellFrameProps = {
  user: {
    name?: string | null;
    email: string;
    globalRole?: string;
  };
  workspaces: {
    id: string;
    name: string;
    typeformId?: string;
    templateFormTypeformId?: string | null;
  }[];
  currentWorkspaceId: string;
  children: React.ReactNode;
};

export function WorkspaceShellFrame({
  user,
  workspaces,
  currentWorkspaceId,
  children,
}: WorkspaceShellFrameProps) {
  const segment = useSelectedLayoutSegment();
  const currentSection =
    segment === "forms" || segment === "responses" ? "forms" : "home";

  return (
    <WorkspaceShell
      user={user}
      workspaces={workspaces}
      currentWorkspaceId={currentWorkspaceId}
      currentSection={currentSection}
    >
      {children}
    </WorkspaceShell>
  );
}