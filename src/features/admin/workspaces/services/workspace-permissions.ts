import { prisma } from "@/lib/prisma";

type CurrentUser = {
  id: string;
  globalRole: string;
};

export type WorkspaceSummary = {
  id: string;
  name: string;
  typeformId: string;
};

export async function getVisibleWorkspaces(user: CurrentUser) {
  if (user.globalRole === "SUPER_ADMIN") {
    return prisma.workspace.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        typeformId: true,
      },
    });
  }

  const userWorkspaces = await prisma.userWorkspace.findMany({
    where: { userId: user.id },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          typeformId: true,
        },
      },
    },
    orderBy: {
      workspace: {
        name: "asc",
      },
    },
  });

  return userWorkspaces.map(({ workspace }) => workspace);
}

export async function getAuthorizedWorkspace(
  user: CurrentUser,
  workspaceId: string,
) {
  if (user.globalRole === "SUPER_ADMIN") {
    return prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        typeformId: true,
      },
    });
  }

  const access = await prisma.userWorkspace.findUnique({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId,
      },
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          typeformId: true,
        },
      },
    },
  });

  return access?.workspace ?? null;
}