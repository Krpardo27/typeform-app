import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/features/admin/workspaces/components/WorkspaceShell";
import { getWorkspaceAccessContext } from "@/features/admin/workspaces/services/workspace-access";
import { createDefaultFormForWorkspaceAction } from "@/features/typeform/actions/create-default-form-for-workspace.action";
import { BaseFormsGrid } from "@/features/typeform/components/BaseFormsGrid";
import { EmptyBaseFormsState } from "@/features/typeform/components/EmptyBaseFormsState";
import { NewWorkspaceFormHeader } from "@/features/typeform/components/NewWorkspaceFormHeader";
import { getWorkspaceForms } from "@/features/typeform/services/typeform.service";

export default async function NewWorkspaceFormPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const { user, workspaces, workspace, canCreateForms } =
    await getWorkspaceAccessContext(workspaceId);

  if (!canCreateForms) {
    notFound();
  }

  const forms = await getWorkspaceForms(workspace.typeformId);
  const createDefaultForm = createDefaultFormForWorkspaceAction.bind(
    null,
    workspace.id,
  );

  return (
    <WorkspaceShell
      user={user}
      workspaces={workspaces}
      currentWorkspaceId={workspace.id}
      currentSection="forms"
    >
      <NewWorkspaceFormHeader
        workspaceId={workspace.id}
        workspaceName={workspace.name}
      />

      {forms.items.length === 0 ? (
        <EmptyBaseFormsState action={createDefaultForm} />
      ) : (
        <BaseFormsGrid workspaceId={workspace.id} forms={forms.items} />
      )}
    </WorkspaceShell>
  );
}
