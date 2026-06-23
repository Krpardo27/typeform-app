"use client";

import { usePathname, useRouter } from "next/navigation";
import { LuLayoutDashboard, LuFileText, LuInbox } from "react-icons/lu";
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
};

const workspaceNavItems = [
  { label: "Inicio", href: "", icon: LuLayoutDashboard },
  { label: "Formularios", href: "forms", icon: LuFileText },
  { label: "Respuestas", href: "responses", icon: LuInbox },
];

export function WorkspaceSidebar({ user, workspaces }: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const displayName = user.name?.trim() || user.email.split("@")[0];

  const segments = pathname.split("/");
  const currentWorkspaceId =
    segments[1] === "workspaces" && segments[2] && segments[2] !== "me"
      ? segments[2]
      : null;

  return (
    <aside className="flex min-h-dvh w-72 shrink-0 flex-col border-r border-zinc-800 bg-[#0f0f0f] px-4 py-6 text-zinc-200">
      {/* Header del Sidebar */}
      <div className="mb-4">
        <p className="text-xs text-zinc-500 mb-2">Radios</p>
        <div className="space-y-1">
          {workspaces.map((w) => {
            const isActive = currentWorkspaceId === w.id;

            return (
              <button
                key={w.id}
                onClick={() => router.push(`/workspaces/${w.id}`)}
                className={`w-full text-left px-2 py-1 rounded-md text-sm transition ${
                  isActive
                    ? "bg-[#C8A96E]/10 text-[#C8A96E]"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                📻 {w.name}
              </button>
            );
          })}
        </div>
      </div>
      {/* SOLO SI HAY WORKSPACE */}
      {currentWorkspaceId && (
        <nav className="space-y-1">
          {workspaceNavItems.map((item) => (
            <button
              key={item.label}
              onClick={() =>
                router.push(
                  item.href
                    ? `/workspaces/${currentWorkspaceId}/${item.href}`
                    : `/workspaces/${currentWorkspaceId}`,
                )
              }
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white"
            >
              {item.label}
            </button>
          ))}
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
