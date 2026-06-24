"use server";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getWorkspaceAccessContext } from "@/features/admin/workspaces/services/workspace-access";
import { duplicateTypeformForm } from "@/features/typeform/services/typeform.service";
import { prisma } from "@/lib/prisma";

export async function duplicateFormAction(
  workspaceId: string,
  formId: string,
  formData: FormData,
) {
  const { workspace, canCreateForms } = await getWorkspaceAccessContext(workspaceId);

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

  revalidatePath(`/workspaces/${workspace.id}/forms`);
  revalidatePath(`/admin/workspaces/${workspace.id}`);
  redirect(
    `/workspaces/${workspace.id}/forms/${duplicated.createdForm.id}?clonedFrom=${formId}`,
  );
}
