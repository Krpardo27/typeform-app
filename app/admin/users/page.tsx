import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/getCurrentUser";

export default async function AdminUsersPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/auth/login");
  }

  if (currentUser.globalRole !== "SUPER_ADMIN") {
    notFound();
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      workspaces: {
        include: {
          workspace: true,
        },
      },
    },
  });

  return (
    <div className="min-h-dvh bg-[#0b0b0d] text-zinc-100">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Administración de usuarios
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Gestión de accesos a radios / workspaces
          </p>
        </div>

        <Link
          href="/admin/workspaces"
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 transition hover:border-[#C8A96E] hover:text-[#C8A96E]"
        >
          Ver workspaces
        </Link>
      </div>

      {/* Table container */}
      <div className="rounded-xl border border-zinc-800 bg-[#111113] overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-12 px-5 py-3 text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
          <div className="col-span-4">Usuario</div>
          <div className="col-span-3">Rol</div>
          <div className="col-span-3">Workspaces</div>
          <div className="col-span-2 text-right">Acción</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-zinc-800">
          {users.map((user) => {
            const workspaceCount = user.workspaces.length;

            return (
              <div
                key={user.id}
                className="grid grid-cols-12 px-5 py-4 items-center hover:bg-zinc-900/40 transition"
              >
                {/* Usuario */}
                <div className="col-span-4 min-w-0">
                  <p className="font-medium text-white truncate">
                    {user.name || "Sin nombre"}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                </div>

                {/* Rol */}
                <div className="col-span-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-md border ${
                      user.globalRole === "SUPER_ADMIN"
                        ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                        : "border-zinc-700 text-zinc-400"
                    }`}
                  >
                    {user.globalRole}
                  </span>
                </div>

                {/* Workspaces */}
                <div className="col-span-3 text-sm text-zinc-400">
                  {workspaceCount === 0 ? (
                    <span className="text-zinc-600">Sin asignar</span>
                  ) : (
                    `${workspaceCount} asignados`
                  )}
                </div>

                {/* Acción */}
                <div className="col-span-2 flex justify-end">
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="text-xs px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-[#C8A96E] hover:text-[#C8A96E] transition"
                  >
                    Gestionar
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
