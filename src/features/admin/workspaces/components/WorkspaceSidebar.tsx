import Link from "next/link";
import { LuFileText, LuLayoutDashboard } from "react-icons/lu";
import { LogoutButton } from "@/shared/components/LogoutButton";
import { WorkspacePanelLink } from "./WorkspacePanelLink";
import { WorkspaceRadioLogo } from "./WorkspaceRadioLogo";

type WorkspaceSidebarProps = {
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
};

const workspaceNavItems = [
  { label: "Inicio", href: "", icon: LuLayoutDashboard, section: "home" },
  { label: "Formularios", href: "forms", icon: LuFileText, section: "forms" },
] as const;

export function WorkspaceSidebar({
  user,
  workspaces,
  currentWorkspaceId,
  currentSection = "home",
}: WorkspaceSidebarProps) {
  const displayName =
    user.name?.trim() || user.email.split("@")[0].trim() || "Usuario";
  const panelHref = user.globalRole === "SUPER_ADMIN"
    ? "/admin/workspaces"
    : workspaces[0] ? `/workspaces/${workspaces[0].id}` : "/workspaces/me";
  const focusClassName =
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A33116]";

  return (
    <aside
      aria-label="Barra lateral de radios"
      className="hidden h-dvh w-72 shrink-0 flex-col border-r border-[#E5E5E5] bg-white px-4 py-5 lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <nav aria-label="Panel" className="shrink-0 border-b border-[#E5E5E5] pb-4">
          <WorkspacePanelLink href={panelHref} focusClassName={focusClassName} />
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-5">
          <nav aria-label="Radios">
            <p className="mb-3 px-3 text-sm font-semibold uppercase tracking-wider text-[#737373]">
              Radios
            </p>
            <ul className="space-y-1">
              {workspaces.map((workspace) => {
                const isActive = currentWorkspaceId === workspace.id;

                return (
                  <li key={workspace.id}>
                    <Link
                      href={`/workspaces/${workspace.id}`}
                      prefetch={false}
                      aria-current={isActive ? "location" : undefined}
                      title={workspace.name}
                      className={`flex min-h-12 w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors motion-reduce:transition-none ${focusClassName} ${
                        isActive
                          ? "bg-[#FFF1EB] font-medium text-[#FF5C35]"
                          : "text-[#525252] hover:bg-[#F5F5F5] hover:text-[#171717]"
                      }`}
                    >
                      <WorkspaceRadioLogo
                        workspace={{ ...workspace, typeformId: workspace.typeformId ?? workspace.id }}
                        size={64}
                        alt=""
                        fallback="icon"
                      />
                      <span className="min-w-0 flex-1 wrap-anywhere leading-5">
                        {workspace.name}
                      </span>
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="size-1.5 shrink-0 rounded-full bg-[#FF5C35]"
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
            {workspaces.length === 0 && (
              <p className="px-3 text-sm leading-6 text-[#737373]">
                No tienes radios asignadas.
              </p>
            )}
          </nav>

          {currentWorkspaceId && (
            <nav
              aria-label="Workspace actual"
              className="mt-5 border-t border-[#E5E5E5] pt-5"
            >
              <p className="mb-3 px-3 text-sm font-semibold uppercase tracking-wider text-[#737373]">
                Workspace actual
              </p>
              <ul className="space-y-1">
                {workspaceNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentSection === item.section;
                  const href = item.href
                    ? `/workspaces/${currentWorkspaceId}/${item.href}`
                    : `/workspaces/${currentWorkspaceId}`;
                  const itemClassName = `group flex min-h-10 min-w-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm leading-5 transition-colors motion-reduce:transition-none ${focusClassName} ${
                    isActive
                      ? "bg-[#FFF1EB] font-medium text-[#FF5C35]"
                      : "text-[#525252] hover:bg-[#F5F5F5] hover:text-[#171717]"
                  }`;

                  return (
                    <li key={item.section}>
                      <Link
                        href={href}
                        aria-current={isActive ? "location" : undefined}
                        className={itemClassName}
                      >
                        <Icon
                          aria-hidden="true"
                          className={`size-4 shrink-0 ${
                            isActive
                              ? "text-[#FF5C35]"
                              : "text-[#737373] group-hover:text-[#525252]"
                          }`}
                        />
                        <span className="min-w-0 flex-1 wrap-anywhere">
                          {item.label}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
        </div>

        <div className="shrink-0 border-t border-[#E5E5E5] px-1 pt-4">
          <div className="mb-4 flex min-w-0 items-center gap-3">
            <div
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] text-sm font-semibold text-[#525252]"
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p
                title={displayName}
                className="truncate text-sm font-semibold text-[#171717]"
              >
                {displayName}
              </p>
              <p title={user.email} className="truncate text-sm leading-5 text-[#737373]">
                {user.email}
              </p>
            </div>
          </div>

          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
