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

const adminNavItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LuChartPie },
  { href: "/admin/workspaces", label: "Workspaces", icon: LuFolder },
  { href: "/admin/users", label: "Usuarios", icon: LuUsers },
  { href: "/admin/miembros", label: "Agregar miembros", icon: LuUserPlus },
  { href: "/admin/auditoria", label: "Auditoría", icon: LuClipboardList },
] as const;

export default function AdminWorkspacesNav() {
  const pathname = usePathname()?.replace(/\/$/, "") ?? "";

  return (
    <nav aria-label="Administración">
      <ul className="space-y-1">
        {adminNavItems.map((item) => {
          const Icon = item.icon;
          const isCurrentPage = pathname === item.href;
          const isActive = isCurrentPage || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isCurrentPage ? "page" : isActive ? "location" : undefined}
                onNavigate={(event) => {
                  if (isCurrentPage) event.preventDefault();
                }}
                className={`group flex min-h-10 min-w-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm leading-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A33116] motion-reduce:transition-none ${
                  isActive
                    ? "bg-[#FFF1EB] font-medium text-[#FF5C35]"
                    : "text-[#525252] hover:bg-[#F5F5F5] hover:text-[#171717]"
                }`}
              >
                <Icon
                  aria-hidden="true"
                  className={`size-4 shrink-0 ${isActive ? "text-[#FF5C35]" : "text-[#737373] group-hover:text-[#525252]"}`}
                />
                <span className="min-w-0 flex-1 wrap-anywhere">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}