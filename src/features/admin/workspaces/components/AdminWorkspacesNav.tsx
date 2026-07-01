"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LuChartPie,
  LuClipboardList,
  LuFolder,
  LuLayoutDashboard,
  LuUserPlus,
  LuUsers,
} from "react-icons/lu";

export default function AdminWorkspacesNav() {
  const pathname = usePathname();

  const isDashboard = pathname === "/admin";
  const isWorkspaces = pathname.startsWith("/admin/workspaces");
  const isUsers = pathname.startsWith("/admin/users");
  const isMembers = pathname.startsWith("/admin/miembros");
  const isAudit = pathname.startsWith("/admin/auditoria");

  return (
    <div className="px-4 py-6 text-zinc-200">
      <p className="text-xs text-zinc-500 mb-3 font-medium uppercase tracking-wider">
        Administración
      </p>

      <nav className="space-y-1">
        <Link
          href="/admin"
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
            isDashboard
              ? "bg-[#C8A96E]/10 text-[#C8A96E]"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
          }`}
        >
          <LuChartPie className="size-4" />
          Dashboard
        </Link>

        <Link
          href="/admin/workspaces"
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
            isWorkspaces
              ? "bg-[#C8A96E]/10 text-[#C8A96E]"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
          }`}
        >
          <LuFolder className="size-4" />
          Workspaces
        </Link>

        <Link
          href="/admin/users"
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
            isUsers
              ? "bg-[#C8A96E]/10 text-[#C8A96E]"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
          }`}
        >
          <LuUsers className="size-4" />
          Usuarios
        </Link>

        <Link
          href="/admin/miembros"
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
            isMembers
              ? "bg-[#C8A96E]/10 text-[#C8A96E]"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
          }`}
        >
          <LuUserPlus className="size-4" />
          Agregar miembros
        </Link>

        <Link
          href="/admin/auditoria"
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
            isAudit
              ? "bg-[#C8A96E]/10 text-[#C8A96E]"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
          }`}
        >
          <LuClipboardList className="size-4" />
          Auditoria
        </Link>

        <hr className="my-4 border-zinc-800" />

        <Link
          href="/workspaces/me"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white transition"
        >
          <LuLayoutDashboard className="size-4" />
          Volver a la App
        </Link>
      </nav>
    </div>
  );
}