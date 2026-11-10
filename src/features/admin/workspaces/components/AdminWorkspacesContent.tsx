import Pagination from "@/shared/components/Pagination";
import { AdminWorkspacesGrid } from "./AdminWorkspacesGrid";
import type { AdminWorkspacesPage } from "../services/admin-workspaces-list.service";

type Props = {
  page: AdminWorkspacesPage;
  pageSizeOptions: number[];
};

export function AdminWorkspacesContent({
  page,
  pageSizeOptions,
}: Props) {
  return (
    <section className="space-y-6">
      <AdminWorkspacesGrid appWorkspaces={page.items} />

      <Pagination
        currentPage={page.currentPage}
        totalPages={page.totalPages}
        totalItems={page.totalItems}
        itemsPerPage={page.itemsPerPage}
        itemLabel="workspaces"
        showPageSizeSelector
        pageSizeOptions={pageSizeOptions}
      />
    </section>
  );
}