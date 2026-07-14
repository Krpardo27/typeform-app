"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/getCurrentUser";

const deleteUserSchema = z.object({
  userId: z.string().min(1, "ID de usuario inválido."),
});

export async function deleteUserAction(userId: string) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return { error: "No autenticado." };
  }

  if (currentUser.globalRole !== "SUPER_ADMIN") {
    return { error: "No tienes permisos para realizar esta acción." };
  }

  const parsed = deleteUserSchema.safeParse({ userId });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { userId: validatedUserId } = parsed.data;

  if (validatedUserId === currentUser.id) {
    return { error: "No puedes eliminar tu propia cuenta." };
  }

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: validatedUserId },
      select: { id: true, email: true, globalRole: true },
    });

    if (!targetUser) {
      return { error: "Usuario no encontrado." };
    }

    if (targetUser.globalRole === "SUPER_ADMIN") {
      const superAdminCount = await prisma.user.count({
        where: { globalRole: "SUPER_ADMIN" },
      });

      if (superAdminCount <= 1) {
        return { error: "No puedes eliminar al único Super Admin." };
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.session.deleteMany({
        where: { userId: validatedUserId },
      });

      await tx.userWorkspace.deleteMany({
        where: { userId: validatedUserId },
      });

      await tx.allowedUser.deleteMany({
        where: {
          email: {
            equals: targetUser.email,
            mode: "insensitive",
          },
        },
      });

      await tx.user.delete({
        where: { id: validatedUserId },
      });
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/miembros");
    revalidatePath("/admin/workspaces");

    return { success: true };
  } catch (error) {
    console.error(error);

    return { error: "No fue posible eliminar el usuario." };
  }
}