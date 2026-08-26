import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { prisma } from "@/lib/prisma";
import { getAuthorizedWorkspace, getVisibleWorkspaces } from "./workspace-permissions";

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

  const [workspaces, workspace] = await Promise.all([
    getVisibleWorkspaces(user),
    getAuthorizedWorkspace(user, workspaceId),
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
