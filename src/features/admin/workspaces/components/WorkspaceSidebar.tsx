import Link from "next/link";
import { LuFileText, LuHouse, LuLayoutDashboard } from "react-icons/lu";
import { LogoutButton } from "../../../../shared/components/LogoutButton";

type WorkspaceSidebarProps = {
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
};

const workspaceNavItems = [
  { label: "Inicio", href: "", icon: LuLayoutDashboard, section: "home" },
  { label: "Formularios", href: "forms", icon: LuFileText },
] as const;

export function WorkspaceSidebar({
  user,
  workspaces,
  currentWorkspaceId,
  currentSection,
}: WorkspaceSidebarProps) {
  const displayName = user.name?.trim() || user.email.split("@")[0];

  return (
    <aside className="flex h-full min-h-0 w-72 shrink-0 flex-col overflow-y-auto border-r border-zinc-800 bg-[#0f0f0f] px-4 py-6 text-zinc-200">
      <div className="mb-4">
        <Link
          href={currentWorkspaceId ? `/workspaces/${currentWorkspaceId}` : "/workspaces/me"}
          className="mb-5 flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
        >
          <LuHouse className="size-4 text-[#C8A96E]" />
          Panel
        </Link>

        <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Radios
        </p>
        <div className="space-y-1">
          {workspaces.map((w) => {
            const isActive = currentWorkspaceId === w.id;

            return (
              <Link
                key={w.id}
                href={`/workspaces/${w.id}`}
                prefetch={false}
                className={`block w-full rounded-md px-2 py-1.5 text-left text-sm transition ${
                  isActive
                    ? "bg-[#C8A96E]/10 text-[#C8A96E]"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                {w.name}
              </Link>
            );
          })}
        </div>
      </div>

      {currentWorkspaceId && (
        <nav className="mt-3 border-t border-zinc-800 pt-4">
          <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Workspace
          </p>
          <div className="space-y-1">
            {workspaceNavItems.map((item) => {
              const Icon = item.icon;
              const section = "section" in item ? item.section : item.href;
              const isActive = currentSection === section;
              const href = item.href
                ? `/workspaces/${currentWorkspaceId}/${item.href}`
                : `/workspaces/${currentWorkspaceId}`;

              return (
                <Link
                  key={item.label}
                  href={href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                    isActive
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                  }`}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      <div className="mt-auto border-t border-zinc-800/80 pt-4 px-1">
        <div className="mb-4 flex items-center gap-3 min-w-0">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-zinc-800 to-zinc-900 border border-zinc-700 text-sm font-bold text-[#C8A96E]">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {displayName}
            </p>
            <p className="truncate text-xs text-zinc-500">{user.email}</p>
          </div>
        </div>

        <LogoutButton />
      </div>
    </aside>
  );
}
