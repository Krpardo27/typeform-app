import { getWorkspaceAccessContext } from "@/features/admin/workspaces/services/workspace-access";
import { EmptyWorkspaceFormsState } from "@/features/typeform/components/forms/EmptyWorkspaceFormsState";
import { WorkspaceFormsGrid } from "@/features/typeform/components/forms/WorkspaceFormsGrid";
import { WorkspaceFormsHeader } from "@/features/typeform/components/forms/WorkspaceFormsHeader";
import { getWorkspaceForms } from "@/features/typeform/services/typeform.service";
import Pagination from "@/shared/components/Pagination";

const PAGE_SIZE_OPTIONS = [6, 12, 24, 48];
const DEFAULT_PAGE_SIZE = 12;

export default async function WorkspaceFormsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}) {
  const { workspaceId } = await params;
  const { page, pageSize } = await searchParams;
  const { workspace, canCreateForms } = await getWorkspaceAccessContext(workspaceId);

  const requestedPage = Number.parseInt(page ?? "1", 10) || 1;
  const requestedPageSize = Number.parseInt(pageSize ?? String(DEFAULT_PAGE_SIZE), 10);
  const itemsPerPage = PAGE_SIZE_OPTIONS.includes(requestedPageSize)
    ? requestedPageSize
    : DEFAULT_PAGE_SIZE;

  const forms = await getWorkspaceForms(workspace.typeformId, {
    page: requestedPage,
    pageSize: itemsPerPage,
  });

  const totalItems = forms.total_items;
  const totalPages = Math.max(1, forms.page_count);
  const currentPage = Math.min(Math.max(requestedPage, 1), totalPages);

  return (
    <>
      <WorkspaceFormsHeader
        workspaceId={workspace.id}
        workspaceName={workspace.name}
        totalItems={forms.total_items}
        canCreateForms={canCreateForms}
      />

      {forms.items.length === 0 ? (
        <EmptyWorkspaceFormsState />
      ) : (
        <section className="space-y-6">
          <WorkspaceFormsGrid
            workspaceId={workspace.id}
            workspaceTypeformId={workspace.typeformId}
            forms={forms.items}
            canCreateForms={canCreateForms}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            itemLabel="formularios"
            showPageSizeSelector
            pageSizeOptions={PAGE_SIZE_OPTIONS}
          />
        </section>
      )}
    </>
  );
}
