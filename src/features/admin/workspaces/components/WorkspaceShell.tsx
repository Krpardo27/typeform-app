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
    <div className="flex h-full min-h-0 overflow-hidden bg-[#F7F7F8] text-zinc-900">
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
          <section className="sticky top-4 z-20 border-b border-[#F5F5F5] shadow-sm shadow-black/3 backdrop-blur md:static md:mb-8 md:border-b-0 md:bg-transparent md:pb-0 md:shadow-none md:backdrop-blur-none">
            <div className="w-full max-w-3xl">
              <GlobalSearchForm
                placeholder="Buscar..."
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
