import Link from "next/link";
import { prisma } from "@/lib/prisma";
import WorkspacesPageClient from "@/features/admin/workspaces/components/WorkspacesPageClient";
import { AdminWorkspacesGrid } from "@/features/admin/workspaces/components/AdminWorkspacesGrid";
import { getTypeformWorkspaces } from "@/features/typeform/services/typeform.service";

export default async function AdminWorkspacesPage() {
  const [typeformWorkspaces, appWorkspaces] = await Promise.all([
    getTypeformWorkspaces(),
    prisma.workspace.findMany({
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

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

      <AdminWorkspacesGrid
        typeformWorkspaces={typeformWorkspaces.items}
        appWorkspaces={appWorkspaces}
      />
    </>
  );
}