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

export default function AdminWorkspacesNav() {
  const pathname = usePathname();

  const isDashboard = pathname === "/admin/dashboard";
  const isWorkspaces = pathname.startsWith("/admin/workspaces");
  const isUsers = pathname.startsWith("/admin/users");
  const isMembers = pathname.startsWith("/admin/miembros");
  const isAudit = pathname.startsWith("/admin/auditoria");

  return (
    <div className="text-[#171717]">
      <p className="mb-3 px-2 text-xs font-medium uppercase tracking-wider text-[#737373]">
        Administración
      </p>

      <nav className="space-y-1">
        <Link
          href="/admin/dashboard"
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
            isDashboard
              ? "bg-[#18181B]/10 text-[#18181B]"
              : "text-[#737373] hover:bg-[#F5F5F5] hover:text-[#171717]"
          }`}
        >
          <LuChartPie className="size-4" />
          Dashboard
        </Link>

        <Link
          href="/admin/workspaces"
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
            isWorkspaces
              ? "bg-[#18181B]/10 text-[#18181B]"
              : "text-[#737373] hover:bg-[#F5F5F5] hover:text-[#171717]"
          }`}
        >
          <LuFolder className="size-4" />
          Workspaces
        </Link>

        <Link
          href="/admin/users"
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
            isUsers
              ? "bg-[#18181B]/10 text-[#18181B]"
              : "text-[#737373] hover:bg-[#F5F5F5] hover:text-[#171717]"
          }`}
        >
          <LuUsers className="size-4" />
          Usuarios
        </Link>

        <Link
          href="/admin/miembros"
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
            isMembers
              ? "bg-[#18181B]/10 text-[#18181B]"
              : "text-[#737373] hover:bg-[#F5F5F5] hover:text-[#171717]"
          }`}
        >
          <LuUserPlus className="size-4" />
          Agregar miembros
        </Link>

        <Link
          href="/admin/auditoria"
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
            isAudit
              ? "bg-[#18181B]/10 text-[#18181B]"
              : "text-[#737373] hover:bg-[#F5F5F5] hover:text-[#171717]"
          }`}
        >
          <LuClipboardList className="size-4" />
          Auditoría
        </Link>
      </nav>
    </div>
  );
}