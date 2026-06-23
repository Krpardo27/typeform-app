import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminWorkspaceDetailPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      users: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!workspace) notFound();

  return (
    <div className="min-h-dvh bg-[#0b0b0d] px-10 py-8 text-zinc-100">
      {/* HEADER */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <Link
            href="/admin/workspaces"
            className="text-sm text-zinc-500 hover:text-[#C8A96E]"
          >
            ← Volver
          </Link>

          <h1 className="mt-3 text-2xl font-bold">
            {workspace.name}
          </h1>

          <p className="text-sm text-zinc-500">
            Typeform: {workspace.typeformId}
          </p>
        </div>

        <div className="flex gap-2">
          <span className="rounded-md border border-zinc-800 px-2 py-1 text-xs">
            {workspace.isShared ? "Shared" : "Private"}
          </span>

          {workspace.isDefault && (
            <span className="rounded-md border border-[#C8A96E]/40 px-2 py-1 text-xs text-[#C8A96E]">
              Default
            </span>
          )}
        </div>
      </div>

      {/* GRID LAYOUT */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* USERS */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-[#111113]">
          <div className="border-b border-zinc-800 p-4">
            <h2 className="font-semibold">Usuarios con acceso</h2>
          </div>

          <div className="divide-y divide-zinc-800">
            {workspace.users.length === 0 ? (
              <p className="p-4 text-sm text-zinc-500">
                Sin usuarios asignados
              </p>
            ) : (
              workspace.users.map((uw) => (
                <div
                  key={uw.id}
                  className="flex items-center justify-between p-4"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {uw.user.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {uw.user.email}
                    </p>
                  </div>

                  <span className="text-xs text-zinc-400">
                    {uw.role}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SETTINGS */}
        <div className="rounded-xl border border-zinc-800 bg-[#111113] p-4">
          <h2 className="font-semibold mb-4">Configuración</h2>

          <div className="space-y-3 text-sm">
            <div>
              <p className="text-zinc-500">Workspace ID</p>
              <p>{workspace.id}</p>
            </div>

            <div>
              <p className="text-zinc-500">Estado</p>
              <p>{workspace.isShared ? "Compartido" : "Privado"}</p>
            </div>
          </div>

          <button className="mt-6 w-full rounded-lg bg-[#C8A96E] px-4 py-2 text-sm font-semibold text-zinc-950">
            Editar workspace
          </button>
        </div>
      </div>
    </div>
  );
}