import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { LuArrowUpRight, LuLayoutGrid } from "react-icons/lu";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { AdminUsersList } from "@/features/admin/users/components/AdminUsersList";
import { getAvailableAppWorkspaceWhere } from "@/features/admin/workspaces/services/workspace-availability";

export default async function AdminUsersPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/auth/login");
  }

  if (currentUser.globalRole !== "SUPER_ADMIN") {
    notFound();
  }

  const workspaceWhere = await getAvailableAppWorkspaceWhere();
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      workspaces: {
        where: {
          workspace: workspaceWhere,
        },
        orderBy: {
          workspace: {
            name: "asc",
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
      },
    },
  });

  return (
    <div className="text-[#171717]">
      <AdminPageHeader
        title="Administración de usuarios"
        description="Gestión de accesos a radios / workspaces"
        actions={
          <Link
            href="/admin/workspaces"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#FF5C35]/40 bg-white px-4 py-3 text-sm font-medium text-[#A53318] transition-colors hover:border-[#FF5C35] hover:bg-[#FFF1EC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35] motion-reduce:transition-none"
          >
            <LuLayoutGrid aria-hidden="true" className="size-4 shrink-0" />
            Ver workspaces
            <LuArrowUpRight aria-hidden="true" className="size-4 shrink-0" />
          </Link>
        }
      />

      <AdminUsersList users={users} currentUserId={currentUser.id} />
    </div>
  );
}