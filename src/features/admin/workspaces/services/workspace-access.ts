import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { prisma } from "@/lib/prisma";
import { getAuthorizedWorkspace, getVisibleWorkspaces } from "./workspace-permissions";
import { createWorkspaceAvailabilityLoader } from "./workspace-availability";

export async function getWorkspaceAccessContext(workspaceId: string) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (user.globalRole !== "SUPER_ADMIN") {
    const allowedUser = await prisma.allowedUser.findFirst({
      where: {
        email: {
          equals: user.email,
          mode: "insensitive",
        },
      },
    });

    if (!allowedUser) {
      notFound();
    }
  }

  const loadAvailableIds = createWorkspaceAvailabilityLoader();
  const [workspaces, workspace] = await Promise.all([
    getVisibleWorkspaces(user, loadAvailableIds),
    getAuthorizedWorkspace(user, workspaceId, loadAvailableIds),
  ]);

  if (!workspace) {
    notFound();
  }

  return {
    user,
    workspaces,
    workspace,
    canCreateForms: user.globalRole !== "SUPER_ADMIN" && workspace.role === "EDITOR",
  };
}

// Solo para render: las acciones conservan comprobaciones nuevas tras cada espera sensible.
export const getWorkspaceRenderContext = cache(getWorkspaceAccessContext);
