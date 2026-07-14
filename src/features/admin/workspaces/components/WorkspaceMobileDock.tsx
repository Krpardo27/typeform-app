"use client";

import Link from "next/link";
import { LuFileText, LuHouse, LuLayoutDashboard, LuRadio } from "react-icons/lu";

type WorkspaceMobileDockProps = {
  workspaces: {
    id: string;
    name: string;
  }[];
  currentWorkspaceId?: string;
  currentSection?: "home" | "forms";
};

const workspaceNavItems = [
  { label: "Inicio", href: "", icon: LuLayoutDashboard, section: "home" },
  { label: "Forms", href: "forms", icon: LuFileText, section: "forms" },
] as const;

function getShortWorkspaceName(name?: string) {
  if (!name) return "Radio";

  return name.length > 11 ? `${name.slice(0, 10)}…` : name;
}

export function WorkspaceMobileDock({
  workspaces,
  currentWorkspaceId,
  currentSection,
}: WorkspaceMobileDockProps) {
  const currentWorkspace = workspaces.find(
    (workspace) => workspace.id === currentWorkspaceId,
  );
  const otherWorkspaces = workspaces.filter(
    (workspace) => workspace.id !== currentWorkspaceId,
  );

  const triggerHapticFeedback = () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(12);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="relative mx-auto max-w-xl overflow-hidden rounded-[1.35rem] border border-[#dedede]/10 bg-[#111111]/95 shadow-[0_-12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#C8A96E]/70 to-transparent" />
        <nav className="grid grid-cols-4 gap-1 p-1.5">
          <Link
            href={currentWorkspaceId ? `/workspaces/${currentWorkspaceId}` : "/workspaces/me"}
            onClick={triggerHapticFeedback}
            className="group relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 py-1 text-[9px] font-medium text-zinc-400 transition-colors hover:text-white min-[390px]:text-[10px]"
          >
            <LuHouse className="h-4 w-4 shrink-0" />
            <span className="max-w-full truncate leading-none">Panel</span>
          </Link>

          {currentWorkspaceId &&
            workspaceNavItems.map((item) => {
              const Icon = item.icon;
              const active = currentSection === item.section;
              const href = item.href
                ? `/workspaces/${currentWorkspaceId}/${item.href}`
                : `/workspaces/${currentWorkspaceId}`;

              return (
                <Link
                  key={item.label}
                  href={href}
                  onClick={triggerHapticFeedback}
                  className={
                    active
                      ? "group relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 py-1 text-[9px] font-semibold text-white min-[390px]:text-[10px]"
                      : "group relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 py-1 text-[9px] font-medium text-zinc-400 transition-colors hover:text-white min-[390px]:text-[10px]"
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="max-w-full truncate leading-none">
                    {item.label}
                  </span>
                  <span
                    className={
                      active
                        ? "absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-[#C8A96E] transition-all duration-300 ease-out"
                        : "absolute inset-x-1/2 bottom-1 h-0.5 rounded-full bg-[#C8A96E]/80 opacity-0 transition-all duration-300 ease-out group-hover:inset-x-4 group-hover:opacity-100"
                    }
                  />
                </Link>
              );
            })}

          <div className="group relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 py-1 text-[9px] font-medium text-zinc-400 min-[390px]:text-[10px]">
            <LuRadio className="h-4 w-4 shrink-0 text-[#C8A96E]" />
            <select
              aria-label="Cambiar radio"
              value={currentWorkspaceId ?? ""}
              onChange={(event) => {
                triggerHapticFeedback();
                const nextWorkspaceId = event.target.value;

                if (nextWorkspaceId) {
                  window.location.href = `/workspaces/${nextWorkspaceId}`;
                }
              }}
              className="w-full appearance-none truncate bg-transparent text-center text-[9px] leading-none text-zinc-300 outline-none min-[390px]:text-[10px]"
            >
              <option value="" disabled>
                {getShortWorkspaceName(currentWorkspace?.name)}
              </option>
              {currentWorkspace && (
                <option value={currentWorkspace.id}>
                  {getShortWorkspaceName(currentWorkspace.name)}
                </option>
              )}
              {otherWorkspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </div>
        </nav>
      </div>
    </div>
  );
}