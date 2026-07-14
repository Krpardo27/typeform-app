"use server";

import { revalidatePath } from "next/cache";
import { UserStatus, WorkspaceRole } from "@/generated/prisma/client";
import { createAuditLog } from "@/features/admin/audit/services/audit-log.service";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { prisma } from "@/lib/prisma";

type AuthorizeMemberInput = {
  email: string;
  workspaceId: string;
  role: "VIEWER" | "EDITOR";
};

type AuthorizeMemberResult = {
  success: boolean;
  message: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function fallbackNameFromEmail(email: string) {
  return email.split("@")[0] || "usuario";
}

export async function authorizeMember(
  input: AuthorizeMemberInput,
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

  const email = input.email.trim().toLowerCase();
  const workspaceId = input.workspaceId.trim();
  const role =
    input.role === WorkspaceRole.EDITOR
      ? WorkspaceRole.EDITOR
      : WorkspaceRole.VIEWER;

  if (!email || !workspaceId) {
    return {
      success: false,
      message: "Debes completar email y workspace",
    };
  }

  if (!isValidEmail(email)) {
    return {
      success: false,
      message: "El email no es valido",
    };
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true },
  });

  if (!workspace) {
    return {
      success: false,
      message: "Workspace no encontrado",
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

    const existingAssignment = await tx.userWorkspace.findUnique({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId,
        },
      },
      select: { role: true },
    });

    await tx.userWorkspace.upsert({
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

    return {
      previousRole: existingAssignment?.role ?? null,
    };
  });

  await createAuditLog({
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
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      metadata: {
        eventType: "MEMBER_AUTHORIZED",
        assignedRole: role,
        wasWhitelisted: Boolean(alreadyWhitelisted),
        hadPreviousRole: result.previousRole ?? null,
      },
    },
  });

  revalidatePath("/admin/miembros");
  revalidatePath("/admin/users");
  revalidatePath("/admin/workspaces");
  revalidatePath("/workspaces/me");

  if (!alreadyWhitelisted) {
    return {
      success: true,
      message: `Miembro autorizado y asignado en ${workspace.name} como ${role}`,
    };
  }

  if (result.previousRole && result.previousRole !== role) {
    return {
      success: true,
      message: `Rol actualizado a ${role} en ${workspace.name}`,
    };
  }

  if (result.previousRole === role) {
    return {
      success: true,
      message: `El miembro ya tenia acceso ${role} en ${workspace.name}`,
    };
  }

  return {
    success: true,
    message: `Miembro agregado al workspace ${workspace.name} como ${role}`,
  };
}