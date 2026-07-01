"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { CreateWorkspaceSchema } from "../schemas/workspace.schema";
import {
  createDefaultTypeformFormForWorkspace,
  createTypeformWorkspace,
} from "@/features/typeform/services/typeform.service";

export async function createWorkspaceAction(data: unknown) {
  const result = CreateWorkspaceSchema.safeParse(data);

  if (!result.success) {
    return { errors: result.error.issues };
  }

  const { name } = result.data;

  try {
    const baseFormId = process.env.TYPEFORM_BASE_FORM_ID?.trim();

    if (!baseFormId) {
      throw new Error(
        "TYPEFORM_BASE_FORM_ID no esta definido. Configuralo para crear el formulario por defecto.",
      );
    }

    const typeformWorkspace = await createTypeformWorkspace(name);

    const workspace = await prisma.workspace.create({
      data: {
        name,
        typeformId: typeformWorkspace.id,
        selfUrl: typeformWorkspace.self?.href ?? null,
        accountId: typeformWorkspace.id,
      },
    });

    const duplicated = await createDefaultTypeformFormForWorkspace({
      baseFormId,
      workspaceTypeformId: typeformWorkspace.id,
      title: `Formulario base - ${name}`,
    });

    await prisma.form.upsert({
      where: {
        typeformId: duplicated.createdForm.id,
      },
      create: {
        title: duplicated.createdForm.title ?? `Formulario base - ${name}`,
        description: `Formulario base inicial para ${name}`,
        typeformId: duplicated.createdForm.id,
        selfUrl: duplicated.createdForm.self?.href ?? null,
        workspaceId: workspace.id,
      },
      update: {
        title: duplicated.createdForm.title ?? `Formulario base - ${name}`,
        description: `Formulario base inicial para ${name}`,
        selfUrl: duplicated.createdForm.self?.href ?? null,
        workspaceId: workspace.id,
      },
    });

    revalidatePath("/admin/workspaces");
    return {
      success: true,
      workspace: {
        id: workspace.id,
        name: workspace.name,
        typeformId: workspace.typeformId,
      },
      defaultForm: {
        id: duplicated.createdForm.id,
        title: duplicated.createdForm.title ?? `Formulario base - ${name}`,
      },
    };
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return { errors: [{ message }] };
  }
}
