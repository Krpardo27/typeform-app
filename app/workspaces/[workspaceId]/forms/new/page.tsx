import { notFound } from "next/navigation";
import { getWorkspaceAccessContext } from "@/features/admin/workspaces/services/workspace-access";
import { createDefaultFormForWorkspaceAction } from "@/features/typeform/actions/create-default-form-for-workspace.action";
import { BaseFormsGrid } from "@/features/typeform/components/creation/BaseFormsGrid";
import { EmptyBaseFormsState } from "@/features/typeform/components/creation/EmptyBaseFormsState";
import { NewWorkspaceFormHeader } from "@/features/typeform/components/creation/NewWorkspaceFormHeader";
import { getWorkspaceForms } from "@/features/typeform/services/typeform.service";
import Pagination from "@/shared/components/Pagination";

const PAGE_SIZE_OPTIONS = [6, 12, 24, 48];
const DEFAULT_PAGE_SIZE = 12;

export default async function NewWorkspaceFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}) {
  const { workspaceId } = await params;
  const { page, pageSize } = await searchParams;
  const { workspace, canCreateForms } = await getWorkspaceAccessContext(workspaceId);

  if (!canCreateForms) {
    notFound();
  }

  const forms = await getWorkspaceForms(workspace.typeformId);
  const createDefaultForm = createDefaultFormForWorkspaceAction.bind(
    null,
    workspace.id,
  );
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
      <NewWorkspaceFormHeader
        workspaceId={workspace.id}
        workspaceName={workspace.name}
      />

      {forms.items.length === 0 ? (
        <EmptyBaseFormsState action={createDefaultForm} />
      ) : (
        <section className="space-y-6">
          <BaseFormsGrid workspaceId={workspace.id} forms={paginatedForms} />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            itemLabel="formularios base"
            showPageSizeSelector
            pageSizeOptions={PAGE_SIZE_OPTIONS}
          />
        </section>
      )}
    </>
  );
}
