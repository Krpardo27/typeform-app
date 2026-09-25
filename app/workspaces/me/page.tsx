import { redirect, notFound } from "next/navigation";
import {
  LuBadgeCheck,
  LuBriefcaseBusiness,
  LuChevronRight,
} from "react-icons/lu";
import { getVisibleWorkspaces } from "@/features/admin/workspaces/services/workspace-permissions";
import { NoWorkspaceActions } from "@/features/admin/workspaces/components/NoWorkspaceActions";
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
      <main className="flex min-h-[72vh] w-full items-center justify-center px-4 py-10 sm:px-6">
        <section className="w-full max-w-2xl">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-[#E4E4E7] bg-[#FAFAFA] text-[#52525B]">
              <LuBriefcaseBusiness className="size-6" strokeWidth={1.8} />
            </div>

            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#E4E4E7] bg-white px-2.5 py-1 text-[11px] font-medium text-[#71717A]">
              <span className="size-1.5 rounded-full bg-[#F59E0B]" />
              Acceso pendiente
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-[#18181B] sm:text-3xl">
              Aún no tienes workspaces asignados
            </h1>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#71717A]">
              Tu cuenta está correctamente autenticada, pero todavía no
              tienes acceso a ningún workspace.
            </p>
          </div>

          {/* Main card */}
          <div className="overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            {/* Account status */}
            <div className="flex items-center gap-3 border-b border-[#E4E4E7] px-5 py-4 sm:px-6">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#F4F4F5]">
                <LuBadgeCheck
                  className="size-4 text-[#52525B]"
                  strokeWidth={1.8}
                />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-medium text-[#18181B]">
                  Sesión autenticada
                </p>

                <p className="truncate text-xs text-[#A1A1AA]">
                  {user.email}
                </p>
              </div>

              <span className="ml-auto flex shrink-0 items-center gap-1.5 text-xs font-medium text-[#16A34A]">
                <span className="size-1.5 rounded-full bg-[#16A34A]" />
                Activa
              </span>
            </div>

            {/* Information */}
            <div className="px-5 py-6 sm:px-6">
              <div className="rounded-xl border border-[#E4E4E7] bg-[#FAFAFA] p-4">
                <div className="flex gap-3">
                  <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-[#E4E4E7]">
                    <LuBriefcaseBusiness className="size-3.5 text-[#71717A]" />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-[#18181B]">
                      ¿Qué significa esto?
                    </p>

                    <p className="mt-1 text-sm leading-6 text-[#71717A]">
                      Un administrador debe asignarte al menos un workspace
                      para que puedas acceder a sus recursos y funcionalidades.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-5">
                <NoWorkspaceActions />
              </div>
            </div>
          </div>

          {/* Footer hint */}
          <div className="mt-4 flex items-center justify-center gap-1 text-xs text-[#A1A1AA]">
            <span>¿Necesitas acceso?</span>
            <span className="font-medium text-[#71717A]">
              Contacta a un administrador
            </span>
            <LuChevronRight className="size-3" />
          </div>
        </section>
      </main>
    );
  }

  redirect(`/workspaces/${firstWorkspace.id}`);
}