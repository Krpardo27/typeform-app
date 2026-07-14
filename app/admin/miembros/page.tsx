import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { prisma } from "@/lib/prisma";
import { AdminMembersHeader } from "@/features/admin/members/components/AdminMembersHeader";
import { AuthorizeMemberForm } from "@/features/admin/members/components/AuthorizeMemberForm";
import { NoWorkspacesNotice } from "@/features/admin/members/components/NoWorkspacesNotice";
import { RecentWhitelist } from "@/features/admin/members/components/RecentWhitelist";

export default async function AdminMembersPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/auth/login");
  }

  if (currentUser.globalRole !== "SUPER_ADMIN") {
    notFound();
  }

  const workspaces = await prisma.workspace.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      typeformId: true,
    },
  });

  const allowedUsers = await prisma.allowedUser.findMany({
    orderBy: { createdAt: "desc" },
    take: 80,
    select: {
      id: true,
      email: true,
      createdAt: true,
    },
  });

  const allowedEmails = allowedUsers.map((item) => item.email);

  const users =
    allowedEmails.length > 0
      ? await prisma.user.findMany({
          where: {
            email: { in: allowedEmails },
          },
          include: {
            workspaces: {
              include: {
                workspace: {
                  select: {
                    name: true,
                    typeformId: true,
                  },
                },
              },
            },
          },
        })
      : [];

  return (
    <div className="space-y-6">
      <AdminMembersHeader />

      {workspaces.length === 0 ? (
        <NoWorkspacesNotice />
      ) : (
        <AuthorizeMemberForm workspaces={workspaces} />
      )}

      <RecentWhitelist allowedUsers={allowedUsers} users={users} />
    </div>
  );
}
