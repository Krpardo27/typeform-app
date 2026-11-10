"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LuChartPie,
  LuFolder,
  LuUsers,
} from "react-icons/lu";
import { LogoutButton } from "@/shared/components/LogoutButton";
import { AdminMobileMoreMenu } from "./AdminMobileMoreMenu";

const ADMIN_MOBILE_ROUTES = [
  {
    href: "/admin/dashboard",
    label: "Inicio",
    icon: LuChartPie,
    exact: true,
  },
  {
    href: "/admin/workspaces",
    label: "Radios",
    icon: LuFolder,
  },
  {
    href: "/admin/users",
    label: "Usuarios",
    icon: LuUsers,
  },
];

function isRouteActive(pathname: string, href: string, exact?: boolean) {
  if (exact) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminMobileDock() {
  const pathname = usePathname()?.replace(/\/$/, "") ?? "";

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 w-full min-w-0 max-w-dvw px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
      <div className="relative mx-auto w-full min-w-0 max-w-xl rounded-xl border border-[#E5E5E5] bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <nav aria-label="Administración móvil" className="grid min-w-0 grid-cols-5 gap-1 p-1.5">
          {ADMIN_MOBILE_ROUTES.map((route) => {
            const active = isRouteActive(pathname, route.href, route.exact);
            const isCurrentPage = pathname === route.href;
            const Icon = route.icon;

            return (
              <Link
                key={route.href}
                href={route.href}
                aria-label={route.label}
                title={route.label}
                aria-current={isCurrentPage ? "page" : active ? "location" : undefined}
                onNavigate={(event) => {
                  if (isCurrentPage) event.preventDefault();
                }}
                className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-0.5 py-1 text-[10px] leading-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#A33116] motion-reduce:transition-none min-[390px]:text-xs ${
                  active
                    ? "bg-[#FFF1EB] font-semibold text-[#FF5C35]"
                    : "font-medium text-[#595954] hover:bg-[#F5F5F5] hover:text-[#171717]"
                }`}
              >
                <span className="flex size-8 items-center justify-center">
                  <Icon aria-hidden="true" className="size-5 shrink-0" />
                </span>
                <span className="max-w-full text-center tracking-tight">{route.label}</span>
              </Link>
            );
          })}

          <AdminMobileMoreMenu key={pathname} pathname={pathname} />

          <div className="min-w-0 max-w-full self-stretch *:h-full *:w-full *:min-w-0 *:max-w-full">
            <LogoutButton variant="dock" />
          </div>
        </nav>
      </div>
    </div>
  );
}