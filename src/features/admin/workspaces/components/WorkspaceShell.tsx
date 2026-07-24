import { WorkspaceSidebar } from "./WorkspaceSidebar";
import { WorkspaceMobileDock } from "./WorkspaceMobileDock";
import GlobalSearchForm from "@/features/admin/components/GlobalSearchForm";

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
  showGlobalSearch?: boolean;
  children: React.ReactNode;
};

export function WorkspaceShell({
  user,
  workspaces,
  currentWorkspaceId,
  currentSection,
  showGlobalSearch = true,
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

      <main className="min-w-0 flex-1 overflow-y-auto px-4 pb-28 md:px-8 lg:px-10 lg:py-8">
        {showGlobalSearch && (
          <section className="sticky top-0 z-20 border-b border-zinc-800/70 bg-[#09090b]/90 pt-6 pb-4 backdrop-blur md:static md:mb-8 md:border-b-0 md:bg-transparent md:pb-0 md:backdrop-blur-none">
            <div className="w-full max-w-3xl">
              <GlobalSearchForm
                placeholder="Buscar usuarios autorizados o workspaces..."
                debounceMs={300}
                minLength={2}
                workspaceHrefMode="workspaces"
                currentWorkspaceId={currentWorkspaceId}
                includeForms={Boolean(currentWorkspaceId)}
              />
            </div>
          </section>
        )}

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
