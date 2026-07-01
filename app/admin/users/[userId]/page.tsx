import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { prisma } from "@/lib/prisma";
import { UserWorkspaceForm } from "@/features/admin/workspaces/components/UserWorkspaceForm";
import { getTypeformWorkspaces } from "@/features/typeform/services/typeform.service";
import {
  ensureAppWorkspacesFromTypeform,
  syncTypeformWorkspaceIds,
} from "@/features/admin/workspaces/services/sync-typeform-workspace-ids";

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

  const typeformWorkspaces = await getTypeformWorkspaces();
  await ensureAppWorkspacesFromTypeform(typeformWorkspaces.items);
  await syncTypeformWorkspaceIds(typeformWorkspaces.items);

  const { userId } = await params;
  const [user, workspaces] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        workspaces: {
          include: { workspace: true },
        },
      },
    }),
    prisma.workspace.findMany({
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
    <div className="min-h-dvh bg-[#0b0b0d] px-10 py-8 text-zinc-100">
      <div className="mb-8 flex items-start justify-between gap-6">
        <div>
          <Link
            href="/admin/users"
            className="text-sm text-zinc-500 transition hover:text-[#C8A96E]"
          >
            Volver a usuarios
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">
            {user.name || "Sin nombre"}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">{user.email}</p>
        </div>

        <span className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-400">
          {user.globalRole}
        </span>
      </div>

      <UserWorkspaceForm
        userId={user.id}
        workspaces={workspaces}
        assignedWorkspaces={assignedWorkspaces}
      />
    </div>
  );
}
