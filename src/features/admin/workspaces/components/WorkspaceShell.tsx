import { WorkspaceSidebar } from "./WorkspaceSidebar";
import { WorkspaceMobileDock } from "./WorkspaceMobileDock";

type WorkspaceShellProps = {
  user: {
    name?: string | null;
    email: string;
  };
  workspaces: {
    id: string;
    name: string;
  }[];
  currentWorkspaceId?: string;
  currentSection?: "home" | "forms";
  children: React.ReactNode;
};

export function WorkspaceShell({
  user,
  workspaces,
  currentWorkspaceId,
  currentSection,
  children,
}: WorkspaceShellProps) {
  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-[#09090b] text-zinc-100">
      <div className="hidden lg:block">
        <WorkspaceSidebar
          user={user}
          workspaces={workspaces}
          currentWorkspaceId={currentWorkspaceId}
          currentSection={currentSection}
        />
      </div>

      <main className="min-w-0 flex-1 overflow-y-auto px-4 pb-28 pt-6 md:px-8 lg:px-10 lg:py-8">
        {children}
      </main>
      <WorkspaceMobileDock
        workspaces={workspaces}
        currentWorkspaceId={currentWorkspaceId}
        currentSection={currentSection}
      />
    </div>
  );
}
