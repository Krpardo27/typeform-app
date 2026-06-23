import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { LuCompass } from "react-icons/lu";
import { WorkspaceSidebar } from "@/features/admin/workspaces/components/WorkspaceSidebar";
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

  return (
    <div className="flex min-h-dvh bg-[#09090b] text-zinc-100">
      <WorkspaceSidebar user={user} workspaces={workspaces} />

      <main className="flex-1 px-10 py-8">
        <header className="border-b border-zinc-800/60 pb-6">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
            <LuCompass className="size-3.5 text-[#C8A96E]" />
            <span>Mis Workspaces</span>
          </div>

          <h1 className="mt-2 text-2xl font-bold text-white">
            Workspaces autorizados
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Solo aparecen las radios o marcas asignadas a tu usuario.
          </p>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workspaces.map((workspace) => (
            <Link
              key={workspace.id}
              href={`/workspaces/${workspace.id}`}
              className="rounded-2xl border border-zinc-800 bg-[#111113] p-6 transition hover:border-[#C8A96E]/50"
            >
              <h2 className="text-lg font-semibold text-white">
                {workspace.name}
              </h2>
              <p className="mt-2 text-xs text-zinc-500">
                Typeform workspace ID: {workspace.typeformId}
              </p>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}