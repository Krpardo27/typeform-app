import { prisma } from "@/lib/prisma";
import { syncTypeformWorkspaceIds } from "@/features/admin/workspaces/services/sync-typeform-workspace-ids";
import { getTypeformWorkspaces } from "@/features/typeform/services/typeform.service";
import Pagination from "@/shared/components/Pagination";
import { AdminWorkspacesGrid } from "./AdminWorkspacesGrid";

type Props = {
  currentPage: number;
  itemsPerPage: number;
  pageSizeOptions: number[];
};

export async function AdminWorkspacesContent({
  currentPage,
  itemsPerPage,
  pageSizeOptions,
}: Props) {
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

  const totalItems = typeformWorkspaces.items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const paginatedTypeformWorkspaces = typeformWorkspaces.items.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage,
  );

  return (
    <section className="space-y-6">
      <AdminWorkspacesGrid
        typeformWorkspaces={paginatedTypeformWorkspaces}
        appWorkspaces={appWorkspaces}
      />

      <Pagination
        currentPage={safeCurrentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        itemLabel="workspaces"
        showPageSizeSelector
        pageSizeOptions={pageSizeOptions}
      />
    </section>
  );
}