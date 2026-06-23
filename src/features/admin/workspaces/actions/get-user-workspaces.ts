import { prisma } from "@/lib/prisma";

export async function getUserWorkspaces(userId: string) {
  return prisma.userWorkspace.findMany({
    where: {
      userId,
    },
    include: {
      workspace: true,
    },
    orderBy: {
      workspace: {
        name: "asc",
      },
    },
  });
}