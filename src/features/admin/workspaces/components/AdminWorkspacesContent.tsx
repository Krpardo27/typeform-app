import { prisma } from "@/lib/prisma";
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
  const totalItems = await prisma.workspace.count({
    where: {
      createdFromApp: true,
    },
  });
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

  const appWorkspaces = await prisma.workspace.findMany({
    where: {
      createdFromApp: true,
    },
    include: {
      _count: {
        select: { users: true },
      },
    },
    orderBy: {
      name: "asc",
    },
    skip: (safeCurrentPage - 1) * itemsPerPage,
    take: itemsPerPage,
  });

  return (
    <section className="space-y-6">
      <AdminWorkspacesGrid appWorkspaces={appWorkspaces} />

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