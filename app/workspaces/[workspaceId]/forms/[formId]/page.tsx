import { notFound, redirect } from "next/navigation";
import { getWorkspaceAccessContext } from "@/features/admin/workspaces/services/workspace-access";
import NewWorkspaceFormPage from "../new/page";
import {
  formBelongsToWorkspace,
  getTypeformForm,
  isTypeformNotFoundError,
  resolveWorkspaceTypeformId,
} from "@/features/typeform/services/typeform.service";

async function getExistingTypeformForm(formId: string) {
  try {
    return await getTypeformForm(formId);
  } catch (error) {
    if (isTypeformNotFoundError(error)) {
      notFound();
    }

    throw error;
  }
}

export default async function WorkspaceFormDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; formId: string }>;
  searchParams: Promise<{
    clonedFrom?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const { workspaceId, formId } = await params;
  const { page, pageSize } = await searchParams;

  if (formId === "new") {
    return (
      <NewWorkspaceFormPage
        params={Promise.resolve({ workspaceId })}
        searchParams={Promise.resolve({ page, pageSize })}
      />
    );
  }

  const { workspace } = await getWorkspaceAccessContext(workspaceId);
  const form = await getExistingTypeformForm(formId);
  const resolvedWorkspaceTypeformId = await resolveWorkspaceTypeformId(
    workspace.typeformId,
  );

  if (!formBelongsToWorkspace(form, resolvedWorkspaceTypeformId)) {
    notFound();
  }

  // Compatibilidad con enlaces antiguos: no renderizar una vista intermedia.
  // La redirección solo ocurre después de autorizar workspace y formulario.
  redirect(`/workspaces/${encodeURIComponent(workspace.id)}/forms/${encodeURIComponent(form.id)}/responses`);
}
