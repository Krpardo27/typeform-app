import { getWorkspaceAccessContext } from "@/features/admin/workspaces/services/workspace-access";
import { EmptyWorkspaceFormsState } from "@/features/typeform/components/forms/EmptyWorkspaceFormsState";
import { WorkspaceFormsGrid } from "@/features/typeform/components/forms/WorkspaceFormsGrid";
import { WorkspaceFormsHeader } from "@/features/typeform/components/forms/WorkspaceFormsHeader";
import { getWorkspaceForms } from "@/features/typeform/services/typeform.service";
import Pagination from "@/shared/components/Pagination";

const PAGE_SIZE_OPTIONS = [6, 12, 24, 48];
const DEFAULT_PAGE_SIZE = 12;

function looksLikeInternalWorkspaceId(value: string) {
  return /^c[a-z0-9]{20,}$/i.test(value);
}

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
  const initialWorkspaceLookupKey = looksLikeInternalWorkspaceId(workspace.typeformId)
    ? workspace.name
    : workspace.typeformId;

  const forms = await getWorkspaceForms(initialWorkspaceLookupKey);
  const requestedPage = Number.parseInt(page ?? "1", 10) || 1;
  const requestedPageSize = Number.parseInt(
    pageSize ?? String(DEFAULT_PAGE_SIZE),
    10,
  );
  const itemsPerPage = PAGE_SIZE_OPTIONS.includes(requestedPageSize)
    ? requestedPageSize
    : DEFAULT_PAGE_SIZE;
  const totalItems = forms.items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const currentPage = Math.min(Math.max(requestedPage, 1), totalPages);
  const paginatedForms = forms.items.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

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
            forms={paginatedForms}
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
