"use server";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getWorkspaceAccessContext } from "@/features/admin/workspaces/services/workspace-access";
import { createDefaultTypeformFormForWorkspace } from "@/features/typeform/services/typeform.service";
import { prisma } from "@/lib/prisma";
import { getWorkspaceFormsListPath } from "@/features/typeform/utils/form-redirect";

export async function createDefaultFormForWorkspaceAction(workspaceId: string) {
  const { workspace, canCreateForms } = await getWorkspaceAccessContext(workspaceId);

  if (!canCreateForms) {
    notFound();
  }

  const baseFormId = workspace.templateFormTypeformId?.trim();

  if (!baseFormId) {
    throw new Error(
      `El workspace ${workspace.name} no tiene una plantilla Typeform configurada.`,
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

  redirect(getWorkspaceFormsListPath(workspace.id));
}
