import { prisma } from "@/lib/prisma";
import { filterAvailableWorkspaces, type WorkspaceAvailabilityLoader } from "./workspace-availability";

type CurrentUser = {
  id: string;
  globalRole: string;
};

export type WorkspaceRole = "EDITOR" | "VIEWER";

export type WorkspaceSummary = {
  id: string;
  name: string;
  typeformId: string;
  templateFormTypeformId: string | null;
  role: WorkspaceRole;
};

export async function getVisibleWorkspaces(user: CurrentUser, loadAvailableIds?: WorkspaceAvailabilityLoader) {
  if (user.globalRole === "SUPER_ADMIN") {
    const workspaces = await prisma.workspace.findMany({
      where: {
        createdFromApp: true,
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        typeformId: true,
        templateFormTypeformId: true,
      },
    });

    return filterAvailableWorkspaces(workspaces.map((workspace) => ({
      ...workspace,
      role: "EDITOR" as const,
    })), loadAvailableIds);
  }

  const userWorkspaces = await prisma.userWorkspace.findMany({
    where: {
      userId: user.id,
      workspace: {
        createdFromApp: true,
      },
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          typeformId: true,
          templateFormTypeformId: true,
        },
      },
    },
    orderBy: {
      workspace: {
        name: "asc",
      },
    },
  });

  return filterAvailableWorkspaces(userWorkspaces.map(({ workspace, role }) => ({
    ...workspace,
    role,
  })), loadAvailableIds);
}

export async function getAuthorizedWorkspace(
  user: CurrentUser,
  workspaceId: string,
  loadAvailableIds?: WorkspaceAvailabilityLoader,
) {
  if (user.globalRole === "SUPER_ADMIN") {
    const workspace = await prisma.workspace.findFirst({
      where: {
        createdFromApp: true,
        OR: [{ id: workspaceId }, { typeformId: workspaceId }],
      },
      select: {
        id: true,
        name: true,
        typeformId: true,
        templateFormTypeformId: true,
      },
    });

    if (!workspace) return null;
    const [available] = await filterAvailableWorkspaces([{ ...workspace, role: "EDITOR" as const }], loadAvailableIds);
    return available ?? null;
  }

  const access = await prisma.userWorkspace.findFirst({
    where: {
      userId: user.id,
      workspace: {
        createdFromApp: true,
        OR: [{ id: workspaceId }, { typeformId: workspaceId }],
      },
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          typeformId: true,
          templateFormTypeformId: true,
        },
      },
    },
  });

  if (!access) return null;
  const [available] = await filterAvailableWorkspaces([{ ...access.workspace, role: access.role }], loadAvailableIds);
  return available ?? null;
}