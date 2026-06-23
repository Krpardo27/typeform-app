"use server";

import { revalidatePath } from "next/cache";
import { WorkspaceRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/getCurrentUser";

type UpdateUserWorkspacesInput = {
  userId: string;
  workspaceIds: string[];
};

export async function updateUserWorkspaces(
  data: UpdateUserWorkspacesInput,
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return {
      success: false,
      message: "No autorizado",
      changed: false,
    };
  }

  const { userId, workspaceIds } = data;

  const [user, validWorkspaces] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    }),

    prisma.workspace.findMany({
      where: {
        id: {
          in: workspaceIds,
        },
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (!user) {
    return {
      success: false,
      message: "Usuario no encontrado",
      changed: false,
    };
  }

  const validWorkspaceIds = validWorkspaces.map((workspace) => workspace.id);

  const currentAssignments = await prisma.userWorkspace.findMany({
    where: {
      userId,
    },
    select: {
      workspaceId: true,
    },
  });

  const currentWorkspaceIds = currentAssignments
    .map((item) => item.workspaceId)
    .sort();

  const nextWorkspaceIds = [...validWorkspaceIds].sort();

  const hasChanges =
    JSON.stringify(currentWorkspaceIds) !==
    JSON.stringify(nextWorkspaceIds);

  if (!hasChanges) {
    return {
      success: true,
      changed: false,
      message: "No se detectaron cambios",
    };
  }

  await prisma.$transaction([
    prisma.userWorkspace.deleteMany({
      where: {
        userId,
        workspaceId: {
          notIn: validWorkspaceIds,
        },
      },
    }),

    prisma.userWorkspace.createMany({
      data: validWorkspaceIds.map((workspaceId) => ({
        userId,
        workspaceId,
        role: WorkspaceRole.VIEWER,
      })),
      skipDuplicates: true,
    }),
  ]);

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/workspaces");
  revalidatePath("/workspaces/me");

  return {
    success: true,
    changed: true,
    message: "Permisos actualizados correctamente",
  };
}