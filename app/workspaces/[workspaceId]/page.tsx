import Link from "next/link";
import { LuFilePlus2, LuInbox, LuRadio } from "react-icons/lu";
import { WorkspaceShell } from "@/features/admin/workspaces/components/WorkspaceShell";
import { getWorkspaceAccessContext } from "@/features/admin/workspaces/services/workspace-access";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const { user, workspaces, workspace, canCreateForms } =
    await getWorkspaceAccessContext(workspaceId);

  return (
    <WorkspaceShell
      user={user}
      workspaces={workspaces}
      currentWorkspaceId={workspace.id}
      currentSection="home"
    >
      <header className="border-b border-zinc-800/60 pb-6">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
          <LuRadio className="size-3.5 text-[#C8A96E]" />
          <span>Workspace</span>
        </div>

        <div className="mt-2 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{workspace.name}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Administra los formularios disponibles para esta radio o marca.
            </p>
          </div>

          <span className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-400">
            Rol: {workspace.role}
          </span>
        </div>
      </header>

      <section className="mt-8 grid gap-4 xl:grid-cols-3">
        {canCreateForms ? (
          <Link
            href={`/workspaces/${workspace.id}/forms/new`}
            className="rounded-xl border border-[#C8A96E]/50 bg-[#111113] p-5 transition hover:border-[#C8A96E]"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-[#C8A96E]">
                <LuFilePlus2 className="size-5" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-white">
                  Crear formulario
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Crear mediante duplicacion.
                </p>
              </div>
            </div>
          </Link>
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-[#111113] p-5 opacity-75">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-[#C8A96E]">
              <LuFilePlus2 className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-white">
                Crear formulario
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Disponible solo para editores del workspace.
              </p>
            </div>
          </div>
          </div>
        )}

        <Link
          href={`/workspaces/${workspace.id}/forms`}
          className="rounded-xl border border-zinc-800 bg-[#111113] p-5 transition hover:border-[#C8A96E]/50"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-[#C8A96E]">
              <LuInbox className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-white">Respuestas</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Revisa respuestas por formulario desde la tabla principal.
              </p>
            </div>
          </div>
        </Link>
      </section>
    </WorkspaceShell>
  );
}
