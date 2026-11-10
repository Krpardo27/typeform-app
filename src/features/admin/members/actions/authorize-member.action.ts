"use server";

import { revalidatePath } from "next/cache";
import { UserStatus, WorkspaceRole } from "@/generated/prisma/client";
import { createAuditLog } from "@/features/admin/audit/services/audit-log.service";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { prisma } from "@/lib/prisma";
import { authorizeMemberSchema } from "../schemas/authorize-member.schema";
import { getAvailableAppWorkspaceWhere } from "@/features/admin/workspaces/services/workspace-availability";

type AuthorizeMemberInput = {
  email: string;
  workspaceId: string;
  role: "VIEWER" | "EDITOR";
};

type AuthorizeMemberResult = {
  success: boolean;
  message: string;
};

function fallbackNameFromEmail(email: string) {
  return email.split("@")[0] || "usuario";
}

export async function authorizeMemberBatch(
  input: unknown,
): Promise<AuthorizeMemberResult> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return { success: false, message: "No autorizado" };
  }

  if (currentUser.globalRole !== "SUPER_ADMIN") {
    return {
      success: false,
      message: "Solo un SUPER_ADMIN puede autorizar miembros",
    };
  }

  const parsed = authorizeMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Revisa el correo y los accesos seleccionados." };
  }

  const { email, assignments } = parsed.data;
  const roleByWorkspaceId = new Map<string, WorkspaceRole>();

  for (const assignment of assignments) {
    roleByWorkspaceId.set(assignment.workspaceId, assignment.role);
  }

  const workspaceIds = [...roleByWorkspaceId.keys()];
  const workspaceWhere = await getAvailableAppWorkspaceWhere();

  const workspaces = await prisma.workspace.findMany({
    where: {
      ...workspaceWhere,
      id: {
        in: workspaceIds,
      },
    },
    select: { id: true, name: true },
  });

  if (workspaces.length !== workspaceIds.length) {
    return {
      success: false,
      message: "Uno o mas workspaces no existen o no se pueden asignar",
    };
  }

  const alreadyWhitelisted = await prisma.allowedUser.findUnique({
    where: { email },
    select: { id: true },
  });

  const result = await prisma.$transaction(async (tx) => {
    await tx.allowedUser.upsert({
      where: { email },
      update: {},
      create: { email },
    });

    const user = await tx.user.upsert({
      where: { email },
      update: {
        status: UserStatus.ACTIVE,
      },
      create: {
        id: crypto.randomUUID(),
        email,
        name: fallbackNameFromEmail(email),
        status: UserStatus.ACTIVE,
      },
    });

    const existingAssignments = await tx.userWorkspace.findMany({
      where: {
        userId: user.id,
        workspaceId: {
          in: workspaceIds,
        },
      },
      select: { workspaceId: true, role: true },
    });

    const previousRoleByWorkspaceId = new Map(
      existingAssignments.map((assignment) => [
        assignment.workspaceId,
        assignment.role,
      ]),
    );

    await Promise.all(
      workspaceIds.map((workspaceId) => {
        const role = roleByWorkspaceId.get(workspaceId) ?? WorkspaceRole.VIEWER;

        return tx.userWorkspace.upsert({
          where: {
            userId_workspaceId: {
              userId: user.id,
              workspaceId,
            },
          },
          update: { role },
          create: {
            userId: user.id,
            workspaceId,
            role,
          },
        });
      }),
    );

    return {
      previousRoleByWorkspaceId,
    };
  });

  const workspaceNameById = new Map(
    workspaces.map((workspace) => [workspace.id, workspace.name]),
  );

  await Promise.all(
    workspaceIds.map((workspaceId) => {
      const role = roleByWorkspaceId.get(workspaceId) ?? WorkspaceRole.VIEWER;
      const previousRole = result.previousRoleByWorkspaceId.get(workspaceId);

      return createAuditLog({
        action: "FORM_CLONED",
        actor: {
          id: currentUser.id,
          email: currentUser.email,
          name: currentUser.name,
        },
        target: {
          type: "member_access",
          id: email,
        },
        context: {
          workspaceId,
          workspaceName: workspaceNameById.get(workspaceId),
          metadata: {
            eventType: "MEMBER_AUTHORIZED",
            assignedRole: role,
            wasWhitelisted: Boolean(alreadyWhitelisted),
            hadPreviousRole: previousRole ?? null,
          },
        },
      });
    }),
  );

  revalidatePath("/admin/miembros");
  revalidatePath("/admin/users");
  revalidatePath("/admin/workspaces");
  revalidatePath("/workspaces/me");

  const createdCount = workspaceIds.filter(
    (workspaceId) => !result.previousRoleByWorkspaceId.has(workspaceId),
  ).length;
  const updatedCount = workspaceIds.filter((workspaceId) => {
    const previousRole = result.previousRoleByWorkspaceId.get(workspaceId);
    const nextRole = roleByWorkspaceId.get(workspaceId);

    return previousRole && previousRole !== nextRole;
  }).length;

  if (!alreadyWhitelisted) {
    return {
      success: true,
      message: `Miembro autorizado en ${workspaceIds.length} workspace(s)`,
    };
  }

  if (createdCount === 0 && updatedCount === 0) {
    return {
      success: true,
      message: "El miembro ya tenia esos accesos configurados",
    };
  }

  return {
    success: true,
    message: `Accesos actualizados: ${createdCount} nuevo(s), ${updatedCount} rol(es) modificado(s)`,
  };
}

export async function authorizeMember(
  input: AuthorizeMemberInput,
): Promise<AuthorizeMemberResult> {
  return authorizeMemberBatch({
    email: input.email,
    assignments: [
      {
        workspaceId: input.workspaceId,
        role: input.role,
      },
    ],
  });
}