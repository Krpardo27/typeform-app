import { prisma } from "@/lib/prisma";

type CurrentUser = {
  id: string;
  globalRole: string;
};

export type WorkspaceRole = "EDITOR" | "VIEWER";

export type WorkspaceSummary = {
  id: string;
  name: string;
  typeformId: string;
  role: WorkspaceRole;
};

export async function getVisibleWorkspaces(user: CurrentUser) {
  if (user.globalRole === "SUPER_ADMIN") {
    const workspaces = await prisma.workspace.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        typeformId: true,
      },
    });

    return workspaces.map((workspace) => ({
      ...workspace,
      role: "EDITOR" as const,
    }));
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

  return userWorkspaces.map(({ workspace, role }) => ({
    ...workspace,
    role,
  }));
}

export async function getAuthorizedWorkspace(
  user: CurrentUser,
  workspaceId: string,
) {
  if (user.globalRole === "SUPER_ADMIN") {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        typeformId: true,
      },
    });

    return workspace ? { ...workspace, role: "EDITOR" as const } : null;
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

  return access
    ? {
        ...access.workspace,
        role: access.role,
      }
    : null;
}