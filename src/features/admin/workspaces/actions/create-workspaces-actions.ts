"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { CreateWorkspaceSchema } from "../schemas/workspace.schema";
import {
  createDefaultTypeformFormForWorkspace,
  createTypeformWorkspace,
  getTypeformForm,
  isTypeformNotFoundError,
} from "@/features/typeform/services/typeform.service";

export async function createWorkspaceAction(data: unknown) {
  const user = await getCurrentUser();

  if (!user || user.globalRole !== "SUPER_ADMIN") {
    redirect("/auth/login");
  }

  const result = CreateWorkspaceSchema.safeParse(data);

  if (!result.success) {
    return { errors: result.error.issues };
  }

  const { name, templateFormTypeformId } = result.data;

  try {
    const baseFormId = templateFormTypeformId.trim();

    const baseForm = await getTypeformForm(baseFormId).catch((error: unknown) => {
      if (isTypeformNotFoundError(error)) {
        throw new Error(
          `No se encontro el formulario plantilla de Typeform (${baseFormId}). Revisa que el token tenga acceso a ese formulario.`,
        );
      }

      throw error;
    });

    const typeformWorkspace = await createTypeformWorkspace(name);

    const workspace = await prisma.workspace.create({
      data: {
        name,
        typeformId: typeformWorkspace.id,
        templateFormTypeformId: baseFormId,
        selfUrl: typeformWorkspace.self?.href ?? null,
        accountId: typeformWorkspace.account_id ?? typeformWorkspace.id,
        createdFromApp: true,
      },
    });

    await prisma.userWorkspace.upsert({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId: workspace.id,
        },
      },
      update: {
        role: "EDITOR",
      },
      create: {
        userId: user.id,
        workspaceId: workspace.id,
        role: "EDITOR",
      },
    });

    const duplicated = await createDefaultTypeformFormForWorkspace({
      baseForm,
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
