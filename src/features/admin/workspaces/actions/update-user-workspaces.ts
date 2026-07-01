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

  if (currentUser.globalRole !== "SUPER_ADMIN") {
    return {
      success: false,
      message: "Solo un SUPER_ADMIN puede actualizar permisos",
      changed: false,
    };
  }

  const { userId, workspaceIds } = data;

  const roleByWorkspaceId = new Map<string, WorkspaceRole>();

  for (const rawWorkspaceId of workspaceIds) {
    const [workspaceId, rawRole] = rawWorkspaceId.split("::");
    const role =
      rawRole === WorkspaceRole.EDITOR
        ? WorkspaceRole.EDITOR
        : WorkspaceRole.VIEWER;

    if (!workspaceId) {
      continue;
    }

    if (
      role !== WorkspaceRole.VIEWER &&
      role !== WorkspaceRole.EDITOR
    ) {
      return {
        success: false,
        message: "Rol de workspace invalido",
        changed: false,
      };
    }

    roleByWorkspaceId.set(workspaceId, role);
  }

  const normalizedWorkspaceIds = [...roleByWorkspaceId.keys()];

  const [user, validWorkspaces] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    }),

    prisma.workspace.findMany({
      where: {
        id: {
          in: normalizedWorkspaceIds,
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

  const validWorkspaceIdSet = new Set(validWorkspaceIds);

  const nextAssignments = [...roleByWorkspaceId.entries()]
    .filter(([workspaceId]) => validWorkspaceIdSet.has(workspaceId))
    .map(([workspaceId, role]) => ({ workspaceId, role }));

  const currentAssignments = await prisma.userWorkspace.findMany({
    where: {
      userId,
    },
    select: {
      workspaceId: true,
      role: true,
    },
  });

  const currentWorkspaceIds = currentAssignments
    .map((item) => `${item.workspaceId}:${item.role}`)
    .sort();

  const nextWorkspaceIds = nextAssignments
    .map((item) => `${item.workspaceId}:${item.role}`)
    .sort();

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
          notIn: nextAssignments.map((item) => item.workspaceId),
        },
      },
    }),
    ...nextAssignments.map((assignment) =>
      prisma.userWorkspace.upsert({
        where: {
          userId_workspaceId: {
            userId,
            workspaceId: assignment.workspaceId,
          },
        },
        create: {
          userId,
          workspaceId: assignment.workspaceId,
          role: assignment.role,
        },
        update: {
          role: assignment.role,
        },
      }),
    ),
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