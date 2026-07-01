import { WorkspaceSidebar } from "./WorkspaceSidebar";

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
  currentSection?: "home" | "forms" | "responses";
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
      <WorkspaceSidebar
        user={user}
        workspaces={workspaces}
        currentWorkspaceId={currentWorkspaceId}
        currentSection={currentSection}
      />

      <main className="min-w-0 flex-1 overflow-y-auto px-10 py-8">
        {children}
      </main>
    </div>
  );
}
