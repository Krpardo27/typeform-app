import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { prisma } from "@/lib/prisma";
import { AuthorizeMemberForm } from "@/features/admin/members/components/AuthorizeMemberForm";
import { RevokeMemberButton } from "@/features/admin/members/components/RevokeMemberButton";

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

  const userByEmail = new Map(users.map((user) => [user.email.toLowerCase(), user]));

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Administración
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Agregar miembros</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Autoriza emails para OTP y asigna workspace/rol sin tocar la base de datos manualmente.
        </p>
      </header>

      {workspaces.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-[#111113] p-5 text-sm text-zinc-400">
          No hay workspaces disponibles. Crea al menos uno antes de autorizar miembros.
        </div>
      ) : (
        <AuthorizeMemberForm workspaces={workspaces} />
      )}

      <section className="rounded-xl border border-zinc-800 bg-[#111113] overflow-hidden">
        <div className="border-b border-zinc-800 px-5 py-3">
          <h2 className="text-sm font-semibold text-zinc-200">Whitelist reciente</h2>
        </div>

        {allowedUsers.length === 0 ? (
          <div className="px-5 py-4 text-sm text-zinc-500">Aun no hay miembros autorizados.</div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {allowedUsers.map((allowed) => {
              const user = userByEmail.get(allowed.email.toLowerCase());

              return (
                <div
                  key={allowed.id}
                  className="grid grid-cols-12 items-center gap-2 px-5 py-3 text-sm"
                >
                  <div className="col-span-4 min-w-0">
                    <p className="truncate text-zinc-100">{allowed.email}</p>
                    <p className="text-xs text-zinc-500">
                      {allowed.createdAt.toLocaleString("es-CL")}
                    </p>
                  </div>

                  <div className="col-span-6">
                    {!user || user.workspaces.length === 0 ? (
                      <span className="text-xs text-zinc-500">Sin workspaces asignados</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {user.workspaces.slice(0, 4).map((assignment) => (
                          <span
                            key={`${user.id}-${assignment.workspaceId}`}
                            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300"
                          >
                            {assignment.workspace.name} · {assignment.role}
                          </span>
                        ))}

                        {user.workspaces.length > 4 && (
                          <span className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-500">
                            +{user.workspaces.length - 4} más
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="col-span-2 flex justify-end">
                    <RevokeMemberButton email={allowed.email} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}