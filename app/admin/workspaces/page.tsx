import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import WorkspacesPageClient from "@/features/admin/workspaces/components/WorkspacesPageClient";
import { AdminWorkspacesGrid } from "@/features/admin/workspaces/components/AdminWorkspacesGrid";
import { getTypeformWorkspaces } from "@/features/typeform/services/typeform.service";
import { syncTypeformWorkspaceIds } from "@/features/admin/workspaces/services/sync-typeform-workspace-ids";

export default async function AdminWorkspacesPage() {
  const typeformWorkspaces = await getTypeformWorkspaces();

  await syncTypeformWorkspaceIds(typeformWorkspaces.items);

  const appWorkspaces = await prisma.workspace.findMany({
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
      <AdminPageHeader
        title="Workspaces disponibles"
        description="Inventario completo de radios y marcas configuradas en la app."
        actions={
          <>
          <WorkspacesPageClient /> {/* ← botón Crear Workspace */}

          <Link
            href="/admin/users"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 transition hover:border-[#C8A96E] hover:text-[#C8A96E]"
          >
            Gestionar usuarios
          </Link>
          </>
        }
      />

      <AdminWorkspacesGrid
        typeformWorkspaces={typeformWorkspaces.items}
        appWorkspaces={appWorkspaces}
      />
    </>
  );
}