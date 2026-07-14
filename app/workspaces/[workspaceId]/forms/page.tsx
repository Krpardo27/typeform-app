import { WorkspaceShell } from "@/features/admin/workspaces/components/WorkspaceShell";
import { getWorkspaceAccessContext } from "@/features/admin/workspaces/services/workspace-access";
import { EmptyWorkspaceFormsState } from "@/features/typeform/components/EmptyWorkspaceFormsState";
import { WorkspaceFormsGrid } from "@/features/typeform/components/WorkspaceFormsGrid";
import { WorkspaceFormsHeader } from "@/features/typeform/components/WorkspaceFormsHeader";
import { getWorkspaceForms } from "@/features/typeform/services/typeform.service";

export default async function WorkspaceFormsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const { user, workspaces, workspace, canCreateForms } =
    await getWorkspaceAccessContext(workspaceId);
  const forms = await getWorkspaceForms(workspace.typeformId);

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
        <WorkspaceFormsGrid workspaceId={workspace.id} forms={forms.items} />
      )}
    </WorkspaceShell>
  );
}
