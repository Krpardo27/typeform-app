import { redirect, notFound } from "next/navigation";
import { getVisibleWorkspaces } from "@/features/admin/workspaces/services/workspace-permissions";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { prisma } from "@/lib/prisma";

export default async function MyWorkspacesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (user.globalRole === "SUPER_ADMIN") {
    redirect("/admin/workspaces");
  }

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

  const workspaces = await getVisibleWorkspaces(user);

  const firstWorkspace = workspaces[0];

  if (!firstWorkspace) {
    notFound();
  }

  redirect(`/workspaces/${firstWorkspace.id}`);
}