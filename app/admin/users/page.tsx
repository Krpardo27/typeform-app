import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { AdminUsersList } from "@/features/admin/users/components/AdminUsersList";

export default async function AdminUsersPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/auth/login");
  }

  if (currentUser.globalRole !== "SUPER_ADMIN") {
    notFound();
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      workspaces: {
        include: {
          workspace: true,
        },
      },
    },
  });

  return (
    <div className="text-zinc-100">
      <AdminPageHeader
        title="Administración de usuarios"
        description="Gestión de accesos a radios / workspaces"
        actions={
          <Link
            href="/admin/workspaces"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 transition hover:border-[#C8A96E] hover:text-[#C8A96E]"
          >
            Ver workspaces
          </Link>
        }
      />

      <AdminUsersList users={users} currentUserId={currentUser.id} />
    </div>
  );
}