import Link from "next/link";
import { LuArrowUpRight, LuUsers } from "react-icons/lu";
import { prisma } from "@/lib/prisma";
import WorkspacesPageClient from "@/features/admin/workspaces/components/WorkspacesPageClient";

export default async function AdminWorkspacesPage() {
  const workspaces = await prisma.workspace.findMany({
    include: {
      _count: {
        select: { users: true },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <>
      <div className="mb-8 flex items-start justify-between gap-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Administración
          </p>

          <h1 className="mt-2 text-2xl font-bold text-white">
            Workspaces disponibles
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Inventario completo de radios y marcas configuradas en la app.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <WorkspacesPageClient /> {/* ← botón Crear Workspace */}

          <Link
            href="/admin/users"
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 transition hover:border-[#C8A96E] hover:text-[#C8A96E]"
          >
            Gestionar usuarios
          </Link>
        </div>
      </div>

      {/* GRID */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {workspaces.map((workspace) => (
          <article
            key={workspace.id}
            className="rounded-xl border border-zinc-800 bg-[#111113] p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-white">
                  {workspace.name}
                </h2>

                <p className="mt-1 truncate text-xs text-zinc-500">
                  Typeform workspace ID: {workspace.typeformId}
                </p>
              </div>

              <Link
                href={`/admin/workspaces/${workspace.id}`}
                className="rounded-lg border border-zinc-800 p-2 text-zinc-400 transition hover:border-[#C8A96E] hover:text-[#C8A96E]"
              >
                <LuArrowUpRight className="size-4" />
              </Link>
            </div>

            <div className="mt-5 flex items-center gap-2 text-sm text-zinc-400">
              <LuUsers className="size-4 text-[#C8A96E]" />
              <span>{workspace._count.users} usuarios asignados</span>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}