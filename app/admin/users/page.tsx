import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { DeleteUserButton } from "@/features/admin/users/components/DeleteUserButton";

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
    <div className="text-zinc-100">
      <AdminPageHeader
        title="Administración de usuarios"
        description="Gestión de accesos a radios / workspaces"
        actions={
          <Link
            href="/admin/workspaces"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 transition hover:border-[#C8A96E] hover:text-[#C8A96E]"
          >
            Ver workspaces
          </Link>
        }
      />

      {/* Table container */}
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-[#111113]">
        {/* Header row */}
        <div className="grid grid-cols-12 border-b border-zinc-800 px-5 py-3 text-xs uppercase tracking-wider text-zinc-500">
          <div className="col-span-4">Usuario</div>
          <div className="col-span-3">Rol</div>
          <div className="col-span-3">Workspaces</div>
          <div className="col-span-2 text-right">Acción</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-zinc-800">
          {users.map((user) => {
            const workspaceCount = user.workspaces.length;
            const isSelf = user.id === currentUser.id;

            return (
              <div
                key={user.id}
                className="grid grid-cols-12 items-center px-5 py-4 transition hover:bg-zinc-900/40"
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
                <div className="col-span-2 flex items-start justify-end gap-2">
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs transition hover:border-[#C8A96E] hover:text-[#C8A96E]"
                  >
                    Gestionar
                  </Link>
                  <DeleteUserButton
                    userId={user.id}
                    userName={user.name || user.email}
                    disabled={isSelf}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}