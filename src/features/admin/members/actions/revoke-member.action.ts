"use server";

import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/features/admin/audit/services/audit-log.service";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { prisma } from "@/lib/prisma";

type RevokeMemberResult = {
  success: boolean;
  message: string;
};

export async function revokeMember(emailInput: string): Promise<RevokeMemberResult> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return { success: false, message: "No autorizado" };
  }

  if (currentUser.globalRole !== "SUPER_ADMIN") {
    return {
      success: false,
      message: "Solo un SUPER_ADMIN puede revocar miembros",
    };
  }

  const email = emailInput.trim().toLowerCase();

  if (!email) {
    return { success: false, message: "Email invalido" };
  }

  const allowed = await prisma.allowedUser.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!allowed) {
    return {
      success: false,
      message: "El email no esta en whitelist",
    };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  const removedAssignments = await prisma.$transaction(async (tx) => {
    let deletedSessions = 0;

    if (user) {
      const deleted = await tx.session.deleteMany({
        where: {
          userId: user.id,
        },
      });

      deletedSessions = deleted.count;

      await tx.userWorkspace.deleteMany({
        where: {
          userId: user.id,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          status: "REJECTED",
        },
      });
    }

    await tx.allowedUser.delete({
      where: { email },
    });

    return {
      hadUser: Boolean(user),
      deletedSessions,
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
      metadata: {
        eventType: "MEMBER_REVOKED",
        hadUserRecord: removedAssignments.hadUser,
        deletedSessions: removedAssignments.deletedSessions,
      },
    },
  });

  revalidatePath("/admin/miembros");
  revalidatePath("/admin/users");
  revalidatePath("/admin/workspaces");
  revalidatePath("/workspaces/me");

  return {
    success: true,
    message:
      removedAssignments.deletedSessions > 0
        ? "Miembro revocado correctamente y sesiones cerradas"
        : "Miembro revocado correctamente",
  };
}