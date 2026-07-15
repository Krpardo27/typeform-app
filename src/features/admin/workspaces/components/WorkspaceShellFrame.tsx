"use client";

import { usePathname, useSelectedLayoutSegment } from "next/navigation";
import { WorkspaceShell } from "./WorkspaceShell";

type WorkspaceShellFrameProps = {
  user: {
    name?: string | null;
    email: string;
  };
  workspaces: {
    id: string;
    name: string;
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
  const pathname = usePathname();
  const segment = useSelectedLayoutSegment();
  const currentSection =
    segment === "forms" || segment === "responses" ? "forms" : "home";
  const hideSearchOnFormDetail =
    /^\/workspaces\/[^/]+\/forms\/(?!new$)[^/]+\/?$/.test(pathname ?? "");

  return (
    <WorkspaceShell
      user={user}
      workspaces={workspaces}
      currentWorkspaceId={currentWorkspaceId}
      currentSection={currentSection}
      showGlobalSearch={!hideSearchOnFormDetail}
    >
      {children}
    </WorkspaceShell>
  );
}