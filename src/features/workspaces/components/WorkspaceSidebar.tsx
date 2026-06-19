"use client";

import { usePathname, useRouter } from "next/navigation";
import { LuLayoutDashboard, LuFileText, LuInbox, LuLayers } from "react-icons/lu";
import { LogoutButton } from "./LogoutButton";

type WorkspaceSidebarProps = {
  user: {
    name?: string | null;
    email: string;
  };
};

// Navegación adaptada a tus requerimientos reales
const workspaceNavItems = [
  { label: "Inicio", href: "/workspaces", icon: LuLayoutDashboard },
  { label: "Formularios", href: "/workspaces/active-tabs", icon: LuFileText, isDynamic: true },
  { label: "Respuestas", href: "/workspaces/active-tabs/responses", icon: LuInbox, isDynamic: true },
];

export function WorkspaceSidebar({ user }: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const displayName = user.name?.trim() || user.email.split("@")[0];

  const segments = pathname.split("/");
  const currentWorkspaceId = segments[2] && segments[2] !== "workspaces" ? segments[2] : null;

  return (
    <aside className="flex min-h-dvh w-72 shrink-0 flex-col border-r border-zinc-800 bg-[#0f0f0f] px-4 py-6 text-zinc-200">
      {/* Header del Sidebar */}
      <div className="mb-7 px-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          <LuLayers className="size-3.5 text-[#C8A96E]" />
          <span>Typeform Admin</span>
        </div>
        <h1 className="mt-2 text-lg font-bold tracking-tight text-white">
          Radios & Marcas
        </h1>
      </div>

      {/* Navegación Principal */}
      <nav className="flex-1 space-y-1" aria-label="Workspaces">
        {workspaceNavItems.map((item) => {
          // Si el item es dinámico y no hay un workspace seleccionado, lo deshabilitamos u ocultamos visualmente
          const isDisabled = item.isDynamic && !currentWorkspaceId;
          const targetHref = item.isDynamic && currentWorkspaceId 
            ? `/workspaces/${currentWorkspaceId}${item.href.split("active-tabs")[1] || ""}`
            : item.href;

          const isActive = pathname === targetHref || (item.href === "/workspaces" && pathname === "/workspaces");
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              onClick={() => !isDisabled && router.push(targetHref)}
              disabled={isDisabled}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-[#C8A96E]/10 text-[#C8A96E] border border-[#C8A96E]/20"
                  : isDisabled
                  ? "opacity-30 cursor-not-allowed text-zinc-600"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 border border-transparent"
              }`}
            >
              <Icon className={`size-4 shrink-0 ${isActive ? "text-[#C8A96E]" : "text-zinc-500"}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

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