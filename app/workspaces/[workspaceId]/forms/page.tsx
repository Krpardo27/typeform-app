import { WorkspaceShell } from "@/features/admin/workspaces/components/WorkspaceShell";
import { getWorkspaceAccessContext } from "@/features/admin/workspaces/services/workspace-access";
import { EmptyWorkspaceFormsState } from "@/features/typeform/components/EmptyWorkspaceFormsState";
import { WorkspaceFormsGrid } from "@/features/typeform/components/WorkspaceFormsGrid";
import { WorkspaceFormsHeader } from "@/features/typeform/components/WorkspaceFormsHeader";
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
  const { user, workspaces, workspace, canCreateForms } =
    await getWorkspaceAccessContext(workspaceId);
  const forms = await getWorkspaceForms(workspace.typeformId);
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
    <WorkspaceShell
      user={user}
      workspaces={workspaces}
      currentWorkspaceId={workspace.id}
      currentSection="forms"
    >
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
    </WorkspaceShell>
  );
}
