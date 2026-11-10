import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { UserWorkspaceForm } from "@/features/admin/workspaces/components/UserWorkspaceForm";
import { getAvailableAppWorkspaceWhere } from "@/features/admin/workspaces/services/workspace-availability";

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
  const workspaceWhere = await getAvailableAppWorkspaceWhere();
  const [user, workspaces] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        workspaces: {
          where: {
            workspace: workspaceWhere,
          },
          include: { workspace: true },
        },
      },
    }),
    prisma.workspace.findMany({
      where: workspaceWhere,
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
    <div className="text-[#171717]">
      <AdminPageHeader
        eyebrow=""
        title={user.name || "Sin nombre"}
        description={user.email}
        backHref="/admin/users"
        backLabel="Volver a usuarios"
        actions={
        <span className="border-l-2 border-[#FF5C35]/50 pl-3 text-sm leading-5 text-[#595954]">
          {user.globalRole === "SUPER_ADMIN" ? "Superadministrador" : "Usuario"}
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
