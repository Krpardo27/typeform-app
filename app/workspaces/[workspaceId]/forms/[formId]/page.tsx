import { notFound } from "next/navigation";
import { getWorkspaceAccessContext } from "@/features/admin/workspaces/services/workspace-access";
import { duplicateFormAction } from "@/features/typeform/actions/duplicate-form.action";
import { DuplicateFormPanel } from "@/features/typeform/components/creation/DuplicateFormPanel";
import { WorkspaceFormCloneNotice } from "@/features/typeform/components/forms/WorkspaceFormCloneNotice";
import { WorkspaceFormDetailHeader } from "@/features/typeform/components/forms/WorkspaceFormDetailHeader";
import { WorkspaceFormMetaCards } from "@/features/typeform/components/forms/WorkspaceFormMetaCards";
import { WorkspaceFormStructurePanel } from "@/features/typeform/components/forms/WorkspaceFormStructurePanel";
import NewWorkspaceFormPage from "../new/page";
import {
  formBelongsToWorkspace,
  getTypeformForm,
  resolveWorkspaceTypeformId,
} from "@/features/typeform/services/typeform.service";

function getSuggestedDuplicateTitle(title: string) {
  const normalized = title.trim();
  const numberedMatch = normalized.match(/^(.*)\s\((\d+)\)$/);

  if (numberedMatch) {
    const baseTitle = numberedMatch[1]?.trim();
    const currentNumber = Number(numberedMatch[2]);

    if (baseTitle && Number.isFinite(currentNumber)) {
      return `${baseTitle} (${currentNumber + 1})`;
    }
  }

  return `${normalized} (2)`;
}

export default async function WorkspaceFormDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; formId: string }>;
  searchParams: Promise<{ clonedFrom?: string; page?: string; pageSize?: string }>;
}) {
  const { workspaceId, formId } = await params;
  const { clonedFrom, page, pageSize } = await searchParams;

  if (formId === "new") {
    return (
      <NewWorkspaceFormPage
        params={Promise.resolve({ workspaceId })}
        searchParams={Promise.resolve({ page, pageSize })}
      />
    );
  }

  const { workspace, canCreateForms } = await getWorkspaceAccessContext(workspaceId);
  const form = await getTypeformForm(formId);
  const resolvedWorkspaceTypeformId = await resolveWorkspaceTypeformId(
    workspace.typeformId,
  );

  if (!formBelongsToWorkspace(form, resolvedWorkspaceTypeformId)) {
    notFound();
  }

  const displayUrl = form._links?.display;
  const duplicateForm = duplicateFormAction.bind(null, workspace.id, form.id);

  return (
    <>
      <WorkspaceFormDetailHeader
        workspaceId={workspace.id}
        workspaceName={workspace.name}
        formId={form.id}
        formTitle={form.title}
        displayUrl={displayUrl}
      />

      {clonedFrom && <WorkspaceFormCloneNotice clonedFrom={clonedFrom} />}

      {canCreateForms && (
        <DuplicateFormPanel
          action={duplicateForm}
          defaultTitle={getSuggestedDuplicateTitle(form.title)}
          clonedFrom={clonedFrom}
        />
      )}

      <WorkspaceFormMetaCards
        formId={form.id}
        fieldsCount={form.fields?.length ?? 0}
        hiddenFieldsCount={form.hidden?.length ?? 0}
        clonedFrom={clonedFrom}
      />

      <WorkspaceFormStructurePanel
        welcomeScreensCount={form.welcome_screens?.length ?? 0}
        thankyouScreensCount={form.thankyou_screens?.length ?? 0}
        logicRulesCount={form.logic?.length ?? 0}
        isPublic={form.settings?.is_public !== false}
      />
    </>
  );
}
