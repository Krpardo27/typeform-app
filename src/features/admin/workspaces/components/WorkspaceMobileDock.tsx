"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  LuChevronDown,
  LuFileText,
  LuLayoutDashboard,
  LuRadio,
} from "react-icons/lu";
import { LogoutButton } from "@/shared/components/LogoutButton";

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
}: WorkspaceMobileDockProps) {
  const pathname = usePathname();
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);

  const currentWorkspace = workspaces.find(
    (workspace) => workspace.id === currentWorkspaceId,
  );

  const workspaceHomeHref = currentWorkspaceId
    ? `/workspaces/${currentWorkspaceId}`
    : "/workspaces/me";

  const isHomeActive = currentWorkspaceId
    ? pathname === workspaceHomeHref
    : pathname === "/workspaces/me";

  const isFormsActive = currentWorkspaceId
    ? pathname === `/workspaces/${currentWorkspaceId}/forms`
    : false;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (!detailsRef.current || detailsRef.current.contains(target)) {
        return;
      }

      setIsWorkspaceMenuOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const triggerHapticFeedback = () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(12);
    }
  };

  const closeWorkspaceMenu = () => setIsWorkspaceMenuOpen(false);

  const navItems = currentWorkspaceId
    ? workspaceNavItems.map((item) => ({
        ...item,
        active: item.section === "home" ? isHomeActive : isFormsActive,
      }))
    : [];

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
      <div
        className="
          relative mx-auto max-w-xl
          overflow-visible
          rounded-[1.35rem]
          border border-[#E8E8E6]
          bg-white/95
          shadow-[0_-12px_35px_-12px_rgba(0,0,0,0.18)]
          backdrop-blur-xl
        "
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#FF5C35]/60 to-transparent" />

        <nav className="grid grid-cols-4 gap-1 p-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;

            const href = item.href
              ? `/workspaces/${currentWorkspaceId}/${item.href}`
              : workspaceHomeHref;

            return (
              <Link
                key={item.label}
                href={href}
                onClick={triggerHapticFeedback}
                className={
                  item.active
                    ? item.label === "Forms"
                      ? `
                        group relative
                        flex min-h-14
                        flex-col items-center justify-center
                        gap-1
                        rounded-2xl
                        border border-[#7C3AED]/10
                        bg-[#7C3AED]/10
                        px-0.5 py-1
                        text-[9px] font-semibold
                        text-[#7C3AED]
                        transition-all duration-200
                        min-[390px]:text-[11px]
                      `
                      : `
                        group relative
                        flex min-h-14
                        flex-col items-center justify-center
                        gap-1
                        rounded-2xl
                        border border-[#FF5C35]/10
                        bg-[#FF5C35]/10
                        px-0.5 py-1
                        text-[9px] font-semibold
                        text-[#FF5C35]
                        transition-all duration-200
                        min-[390px]:text-[11px]
                      `
                    : `
                      group relative
                      flex min-h-14
                      flex-col items-center justify-center
                      gap-1
                      rounded-2xl
                      border border-transparent
                      px-0.5 py-1
                      text-[9px] font-medium
                      text-[#000000]/55
                      transition-all duration-200
                      hover:bg-[#F7F7F6]
                      hover:text-[#000000]
                      min-[390px]:text-[11px]
                    `
                }
              >
                <Icon className="h-4 w-4 shrink-0" />

                <span className="max-w-full truncate leading-none">
                  {item.label}
                </span>

                <span
                  className={
                    item.active
                      ? item.label === "Forms"
                        ? "absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-[#7C3AED] transition-all duration-300 ease-out"
                        : "absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-[#FF5C35] transition-all duration-300 ease-out"
                      : item.label === "Forms"
                        ? "absolute inset-x-1/2 bottom-1 h-0.5 rounded-full bg-[#7C3AED]/80 opacity-0 transition-all duration-300 ease-out group-hover:inset-x-4 group-hover:opacity-100"
                        : "absolute inset-x-1/2 bottom-1 h-0.5 rounded-full bg-[#FF5C35]/80 opacity-0 transition-all duration-300 ease-out group-hover:inset-x-4 group-hover:opacity-100"
                  }
                />
              </Link>
            );
          })}

          <details
            ref={detailsRef}
            open={isWorkspaceMenuOpen}
            onToggle={(event) => {
              setIsWorkspaceMenuOpen(event.currentTarget.open);
            }}
            className="group relative"
          >
            <summary
              className="
                relative flex min-h-14
                cursor-pointer list-none
                flex-col items-center justify-center
                gap-1
                rounded-2xl
                border border-transparent
                px-0.5 py-1
                text-[11px] font-medium
                text-[#000000]/55
                outline-none
                transition-all duration-200
                marker:hidden
                hover:bg-[#F7F7F6]
                hover:text-[#000000]
                min-[390px]:text-[10px]
                [&::-webkit-details-marker]:hidden
              "
            >
              <LuRadio className="h-4 w-4 shrink-0 text-[#FF5C35]" />

              <div className="flex items-center gap-1">
                <span className="max-w-full truncate leading-none">
                  {getShortWorkspaceName(currentWorkspace?.name)}
                </span>

                <LuChevronDown
                  className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                    isWorkspaceMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </summary>

            <div
              className="
                absolute bottom-full right-0 z-50 mb-2
                max-h-72 w-56
                overflow-y-auto
                rounded-2xl
                border border-[#E8E8E6]
                bg-white
                p-1.5
                shadow-[0_16px_40px_-14px_rgba(0,0,0,0.22)]
              "
            >
              {workspaces.map((workspace) => {
                const isActive = currentWorkspaceId === workspace.id;

                return (
                  <Link
                    key={workspace.id}
                    href={`/workspaces/${workspace.id}`}
                    prefetch={false}
                    onClick={() => {
                      closeWorkspaceMenu();
                      triggerHapticFeedback();
                    }}
                    className={`
                      block
                      rounded-xl
                      border
                      px-3 py-2
                      text-sm
                      transition-all
                      ${
                        isActive
                          ? "border-[#FF5C35]/10 bg-[#FF5C35]/10 font-medium text-[#FF5C35]"
                          : "border-transparent text-[#000000]/70 hover:border-[#E8E8E6] hover:bg-[#F7F7F6] hover:text-[#000000]"
                      }
                    `}
                  >
                    <span className="block truncate">{workspace.name}</span>
                  </Link>
                );
              })}
            </div>
          </details>

          <LogoutButton variant="workspace-dock" />
        </nav>
      </div>
    </div>
  );
}
