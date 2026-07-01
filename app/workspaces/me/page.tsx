import Link from "next/link";
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
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center px-6 py-12">
        <section className="w-full rounded-2xl border border-zinc-800 bg-[#111113] p-8 text-zinc-200">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Workspace
          </p>

          <h1 className="mt-3 text-2xl font-bold text-white">
            No tienes workspaces asignados
          </h1>

          <p className="mt-3 text-sm text-zinc-400">
            Tu cuenta esta autenticada, pero todavia no tiene acceso a ningun
            workspace. Solicita a un administrador que te asigne uno desde el
            panel de usuarios.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 transition hover:border-[#C8A96E] hover:text-[#C8A96E]"
            >
              Ir al inicio
            </Link>
            <Link
              href="/auth/login"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            >
              Cambiar de cuenta
            </Link>
          </div>
        </section>
      </main>
    );
  }

  redirect(`/workspaces/${firstWorkspace.id}`);
}