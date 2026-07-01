"use server";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getWorkspaceAccessContext } from "@/features/admin/workspaces/services/workspace-access";
import { createDefaultTypeformFormForWorkspace } from "@/features/typeform/services/typeform.service";
import { prisma } from "@/lib/prisma";

export async function createDefaultFormForWorkspaceAction(workspaceId: string) {
  const { workspace, canCreateForms } = await getWorkspaceAccessContext(workspaceId);

  if (!canCreateForms) {
    notFound();
  }

  const baseFormId = process.env.TYPEFORM_BASE_FORM_ID?.trim();

  if (!baseFormId) {
    throw new Error(
      "TYPEFORM_BASE_FORM_ID no esta definido. Configuralo para crear el formulario base.",
    );
  }

  const duplicated = await createDefaultTypeformFormForWorkspace({
    baseFormId,
    workspaceTypeformId: workspace.typeformId,
    title: `Formulario base - ${workspace.name}`,
  });

  await prisma.form.upsert({
    where: {
      typeformId: duplicated.createdForm.id,
    },
    create: {
      title: duplicated.createdForm.title ?? `Formulario base - ${workspace.name}`,
      description: `Formulario base inicial para ${workspace.name}`,
      typeformId: duplicated.createdForm.id,
      selfUrl: duplicated.createdForm.self?.href ?? null,
      workspaceId: workspace.id,
    },
    update: {
      title: duplicated.createdForm.title ?? `Formulario base - ${workspace.name}`,
      description: `Formulario base inicial para ${workspace.name}`,
      selfUrl: duplicated.createdForm.self?.href ?? null,
      workspaceId: workspace.id,
    },
  });

  revalidatePath(`/workspaces/${workspace.id}/forms`);
  revalidatePath(`/workspaces/${workspace.id}/forms/new`);
  revalidatePath(`/admin/workspaces/${workspace.typeformId}`);

  redirect(
    `/workspaces/${workspace.id}/forms/${duplicated.createdForm.id}?clonedFrom=${baseFormId}`,
  );
}
