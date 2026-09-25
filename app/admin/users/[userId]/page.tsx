import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { UserWorkspaceForm } from "@/features/admin/workspaces/components/UserWorkspaceForm";

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/auth/login");
  }

  if (currentUser.globalRole !== "SUPER_ADMIN") {
    notFound();
  }

  const { userId } = await params;
  const [user, workspaces] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        workspaces: {
          where: {
            workspace: {
              createdFromApp: true,
            },
          },
          include: { workspace: true },
        },
      },
    }),
    prisma.workspace.findMany({
      where: {
        createdFromApp: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!user) {
    notFound();
  }

  const assignedWorkspaces = user.workspaces.map((workspaceAccess) => ({
    workspaceId: workspaceAccess.workspaceId,
    role: workspaceAccess.role,
  }));

  return (
    <div className="text-zinc-100">
      <AdminPageHeader
        eyebrow=""
        title={user.name || "Sin nombre"}
        description={user.email}
        backHref="/admin/users"
        backLabel="Volver a usuarios"
        actions={
        <span className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-400">
          {user.globalRole}
        </span>
        }
      />

      <UserWorkspaceForm
        userId={user.id}
        workspaces={workspaces}
        assignedWorkspaces={assignedWorkspaces}
      />
    </div>
  );
}
