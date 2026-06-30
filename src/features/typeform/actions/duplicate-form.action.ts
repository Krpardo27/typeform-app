"use server";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getWorkspaceAccessContext } from "@/features/admin/workspaces/services/workspace-access";
import { duplicateTypeformForm } from "@/features/typeform/services/typeform.service";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/features/admin/audit/services/audit-log.service";

export async function duplicateFormAction(
  workspaceId: string,
  formId: string,
  formData: FormData,
) {
  const { user, workspace, canCreateForms } =
    await getWorkspaceAccessContext(workspaceId);

  if (!canCreateForms) {
    notFound();
  }

  const rawTitle = formData.get("title");
  const title = typeof rawTitle === "string" ? rawTitle.trim() : "";

  if (!title) {
    throw new Error("Debes ingresar un nombre para el formulario duplicado");
  }

  const duplicated = await duplicateTypeformForm({
    formId,
    workspaceTypeformId: workspace.typeformId,
    title,
  });

  if (!duplicated) {
    notFound();
  }

  await prisma.form.upsert({
    where: {
      typeformId: duplicated.createdForm.id,
    },
    create: {
      title,
      description: `Duplicado desde ${duplicated.baseForm.title}`,
      typeformId: duplicated.createdForm.id,
      selfUrl: duplicated.createdForm.self?.href ?? null,
      workspaceId: workspace.id,
    },
    update: {
      title,
      description: `Duplicado desde ${duplicated.baseForm.title}`,
      selfUrl: duplicated.createdForm.self?.href ?? null,
      workspaceId: workspace.id,
    },
  });

  await createAuditLog({
    action: "FORM_CLONED",
    actor: user,
    target: { type: "form", id: duplicated.createdForm.id },
    context: {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      formId: duplicated.createdForm.id,
      formTitle: title,
      metadata: {
        sourceFormId: formId,
        sourceFormTitle: duplicated.baseForm.title ?? null,
      },
    },
  });

  revalidatePath(`/workspaces/${workspace.id}/forms`);
  revalidatePath(`/admin/workspaces/${workspace.typeformId}`);
  redirect(
    `/workspaces/${workspace.id}/forms/${duplicated.createdForm.id}?clonedFrom=${formId}`,
  );
}
