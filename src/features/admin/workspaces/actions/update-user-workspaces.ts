"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { WorkspaceRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { getAvailableAppWorkspaceWhere } from "../services/workspace-availability";

const assignmentSchema = z.string()
  .transform((value) => value.split("::"))
  .pipe(z.tuple([
    z.string().trim().min(1),
    z.enum([WorkspaceRole.VIEWER, WorkspaceRole.EDITOR]),
  ]))
  .transform(([workspaceId, role]) => ({ workspaceId, role }));

const updateUserWorkspacesSchema = z.object({
  userId: z.string().trim().min(1),
  workspaceIds: z.array(assignmentSchema).refine(
    (assignments) => new Set(assignments.map(({ workspaceId }) => workspaceId)).size === assignments.length,
    { message: "No se permiten workspaces duplicados" },
  ),
});

export async function updateUserWorkspaces(
  data: unknown,
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

  const parsed = updateUserWorkspacesSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      message: "Datos de permisos invalidos",
      changed: false,
    };
  }

  const { userId, workspaceIds: nextAssignments } = parsed.data;
  const normalizedWorkspaceIds = nextAssignments.map(({ workspaceId }) => workspaceId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    return {
      success: false,
      message: "Usuario no encontrado",
      changed: false,
    };
  }

  const workspaceWhere = await getAvailableAppWorkspaceWhere();
  const validWorkspaces = await prisma.workspace.findMany({
    where: { ...workspaceWhere, id: { in: normalizedWorkspaceIds } },
    select: { id: true },
  });

  const validWorkspaceIdSet = new Set(validWorkspaces.map((workspace) => workspace.id));

  if (normalizedWorkspaceIds.some((workspaceId) => !validWorkspaceIdSet.has(workspaceId))) {
    return {
      success: false,
      message: "Uno o mas workspaces no existen o no se pueden asignar",
      changed: false,
    };
  }

  const currentAssignments = await prisma.userWorkspace.findMany({
    where: {
      userId,
      workspace: workspaceWhere,
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
        // Revocar solo accesos activos/editables; conservar históricos y externos.
        workspace: workspaceWhere,
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