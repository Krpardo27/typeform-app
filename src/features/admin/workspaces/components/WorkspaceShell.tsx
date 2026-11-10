import { WorkspaceSidebar } from "./WorkspaceSidebar";
import { WorkspaceMobileDock } from "./WorkspaceMobileDock";
import GlobalSearchForm from "@/features/admin/components/GlobalSearchForm";
import { MobileUserIdentity } from "@/shared/components/MobileUserIdentity";
import { WorkspaceRadioLogo } from "./WorkspaceRadioLogo";

type WorkspaceShellProps = {
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
  const currentWorkspace = workspaces.find(
    (workspace) => workspace.id === currentWorkspaceId,
  );

  return (
    <div className="flex min-h-dvh bg-[#F5F5F5] text-[#171717]">
      <div className="hidden h-dvh shrink-0 lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block">
        <WorkspaceSidebar
          user={user}
          workspaces={workspaces}
          currentWorkspaceId={currentWorkspaceId}
          currentSection={currentSection}
        />
      </div>

      <main className="min-w-0 flex-1 lg:pl-72">
        <div className="container mx-auto px-4 pb-[calc(9rem+env(safe-area-inset-bottom))] md:px-8 lg:px-10 lg:py-2">
          <MobileUserIdentity user={user} />
          <section
            aria-label="Contexto del workspace"
            className="sticky top-4 z-20 bg-[#F5F5F5] md:static"
          >
            <div className="flex min-w-0 items-center justify-between gap-3 py-3 sm:gap-6">
              <div className="min-w-0 max-w-3xl flex-1">
                <GlobalSearchForm
                  placeholder="Buscar..."
                  debounceMs={300}
                  minLength={2}
                  workspaceHrefMode="workspaces"
                  currentWorkspaceId={currentWorkspaceId}
                  includeForms={Boolean(currentWorkspaceId)}
                />
              </div>
              {currentWorkspace && (
                <div
                  className="ml-auto hidden w-25 max-w-full shrink-0 lg:block"
                  title={currentWorkspace.name}
                >
                  <WorkspaceRadioLogo
                    workspace={{
                      ...currentWorkspace,
                      typeformId:
                        currentWorkspace.typeformId ?? currentWorkspace.id,
                    }}
                    size={100}
                  />
                </div>
              )}
            </div>
          </section>
          {children}
        </div>
      </main>
      <WorkspaceMobileDock
        workspaces={workspaces}
        currentWorkspaceId={currentWorkspaceId}
        currentSection={currentSection}
      />
    </div>
  );
}
