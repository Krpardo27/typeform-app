import Link from "next/link";
import { LuArrowUpRight, LuFilePlus2, LuFileText } from "react-icons/lu";
import { WorkspaceShell } from "@/features/admin/workspaces/components/WorkspaceShell";
import { getWorkspaceAccessContext } from "@/features/admin/workspaces/services/workspace-access";
import { getWorkspaceForms } from "@/features/typeform/services/typeform.service";

function formatDate(value?: string) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function WorkspaceFormsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const { user, workspaces, workspace, canCreateForms } =
    await getWorkspaceAccessContext(workspaceId);
  const forms = await getWorkspaceForms(workspace.typeformId);
  console.log('USUARIO:', forms)

  return (
    <WorkspaceShell
      user={user}
      workspaces={workspaces}
      currentWorkspaceId={workspace.id}
      currentSection="forms"
    >
      <header className="border-b border-zinc-800/60 pb-6">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
          <LuFileText className="size-3.5 text-[#C8A96E]" />
          <span>{workspace.name}</span>
        </div>

        <div className="mt-2 flex items-end justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Formularios</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Formularios recuperados desde Typeform para este workspace.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <p className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-400">
              {forms.total_items} total
            </p>

            {canCreateForms ? (
              <Link
                href={`/workspaces/${workspace.id}/forms/new`}
                className="inline-flex items-center gap-2 rounded-lg bg-[#C8A96E] px-3 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-[#d7b87b]"
              >
                <LuFilePlus2 className="size-4" />
                Crear
              </Link>
            ) : (
              <span className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-500">
                Solo lectura
              </span>
            )}
          </div>
        </div>
      </header>

      {forms.items.length === 0 ? (
        <section className="mt-8 rounded-xl border border-zinc-800 bg-[#111113] p-6">
          <h2 className="text-base font-semibold text-white">Sin formularios</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Typeform no devolvio formularios para este workspace.
          </p>
        </section>
      ) : (
        <section className="mt-8 overflow-hidden rounded-xl border border-zinc-800 bg-[#111113]">
          <div className="grid grid-cols-[1fr_180px_140px_44px] border-b border-zinc-800 px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
            <span>Formulario</span>
            <span>Actualizado</span>
            <span>Estado</span>
            <span />
          </div>

          <div className="divide-y divide-zinc-800">
            {forms.items.map((form) => (
              <div
                key={form.id}
                className="grid grid-cols-[1fr_180px_140px_44px] items-center gap-4 px-4 py-4"
              >
                <div className="min-w-0">
                  <Link
                    href={`/workspaces/${workspace.id}/forms/${form.id}`}
                    className="truncate text-sm font-semibold text-white transition hover:text-[#C8A96E]"
                  >
                    {form.title}
                  </Link>
                  <p className="mt-1 truncate text-xs text-zinc-500">ID: {form.id}</p>
                </div>

                <p className="text-sm text-zinc-400">
                  {formatDate(form.last_updated_at)}
                </p>

                <span className="w-fit rounded-md border border-zinc-800 px-2 py-1 text-xs text-zinc-400">
                  {form.settings?.is_public === false ? "Privado" : "Publico"}
                </span>

                <Link
                  href={`/workspaces/${workspace.id}/forms/${form.id}`}
                  className="flex size-9 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition hover:border-[#C8A96E] hover:text-[#C8A96E]"
                  aria-label={`Abrir ${form.title}`}
                >
                  <LuArrowUpRight className="size-4" />
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </WorkspaceShell>
  );
}
