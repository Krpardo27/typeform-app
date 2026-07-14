"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LuChartPie,
  LuClipboardList,
  LuFolder,
  LuUserPlus,
  LuUsers,
} from "react-icons/lu";
import { LogoutButton } from "@/shared/components/LogoutButton";

const ADMIN_MOBILE_ROUTES = [
  {
    href: "/admin",
    label: "Inicio",
    icon: LuChartPie,
    exact: true,
  },
  {
    href: "/admin/workspaces",
    label: "Workspaces",
    icon: LuFolder,
  },
  {
    href: "/admin/users",
    label: "Usuarios",
    icon: LuUsers,
  },
  {
    href: "/admin/miembros",
    label: "Miembros",
    icon: LuUserPlus,
  },
  {
    href: "/admin/auditoria",
    label: "Auditoría",
    icon: LuClipboardList,
  },
];

function isRouteActive(pathname: string, href: string, exact?: boolean) {
  if (exact) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminMobileDock() {
  const pathname = usePathname();

  const triggerHapticFeedback = () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(12);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-[#0b0b0d]/80 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
      <div className="animate-[dockIn_380ms_cubic-bezier(0.16,1,0.3,1)] relative mx-auto max-w-xl overflow-hidden rounded-[1.35rem] border border-[#dedede]/10 bg-[#111111] shadow-[0_-12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl motion-reduce:animate-none">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#C8A96E]/70 to-transparent" />
        <nav className="grid grid-cols-6 gap-1 p-1.5">
          {ADMIN_MOBILE_ROUTES.map((route) => {
            const active = isRouteActive(pathname, route.href, route.exact);
            const Icon = route.icon;
            return (
              <Link
                key={route.href}
                href={route.href}
                onClick={triggerHapticFeedback}
                className={
                  active
                    ? "group relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 py-1 text-[9px] font-semibold text-white min-[390px]:text-[10px]"
                    : "group relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 py-1 text-[9px] font-medium text-zinc-400 transition-colors hover:text-white min-[390px]:text-[10px]"
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="max-w-full truncate leading-none">
                  {route.label}
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
          <LogoutButton variant="dock" />
        </nav>
      </div>
    </div>
  );
}