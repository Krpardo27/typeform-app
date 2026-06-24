"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { CreateWorkspaceSchema } from "../schemas/workspace.schema";
import { createTypeformWorkspace } from "@/features/typeform/services/typeform.service";

export async function createWorkspaceAction(data: unknown) {
  const result = CreateWorkspaceSchema.safeParse(data);

  if (!result.success) {
    return { errors: result.error.issues };
  }

  const { name } = result.data;

  try {
    const typeformWorkspace = await createTypeformWorkspace(name);

    await prisma.workspace.create({
      data: {
        name,
        typeformId: typeformWorkspace.id,
        selfUrl: typeformWorkspace.self?.href ?? null,
        accountId: typeformWorkspace.id,
      },
    });

    revalidatePath("/admin/workspaces");
    return { success: true };
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return { errors: [{ message }] };
  }
}
