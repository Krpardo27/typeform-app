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
    <div className="fixed inset-x-0 bottom-0 z-40 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
      <div className="relative mx-auto max-w-xl overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#111111]/95 shadow-[0_-12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        {/* Top accent */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#C8A96E]/70 to-transparent" />

        <nav className="grid grid-cols-[repeat(6,minmax(0,1fr))] gap-0.5 p-1.5">
          {ADMIN_MOBILE_ROUTES.map((route) => {
            const active = isRouteActive(pathname, route.href, route.exact);
            const Icon = route.icon;

            return (
              <Link
                key={route.href}
                href={route.href}
                onClick={triggerHapticFeedback}
                className={`group relative flex min-w-0 min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 transition-colors duration-200 ${
                  active
                    ? "text-white"
                    : "text-white/55 hover:text-white"
                }`}
              >
                <Icon
                  className={`size-[17px] shrink-0 transition-transform duration-200 ${
                    active
                      ? "text-[#C8A96E]"
                      : "group-hover:text-white"
                  }`}
                  strokeWidth={active ? 2.2 : 1.8}
                />

                <span
                  className={`w-full truncate text-center text-[10px] leading-none tracking-[-0.01em] ${
                    active
                      ? "font-semibold text-white"
                      : "font-medium text-white/60"
                  }`}
                >
                  {route.label}
                </span>

                <span
                  className={
                    active
                      ? "absolute bottom-1 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-[#C8A96E]"
                      : "absolute bottom-1 left-1/2 h-0.5 w-0 -translate-x-1/2 rounded-full bg-[#C8A96E] opacity-0 transition-all duration-200 group-hover:w-4 group-hover:opacity-100"
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