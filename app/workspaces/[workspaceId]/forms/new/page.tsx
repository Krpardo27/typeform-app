import { notFound } from "next/navigation";
import Link from "next/link";
import { LuArrowLeft, LuFilePlus2 } from "react-icons/lu";
import { WorkspaceShell } from "@/features/admin/workspaces/components/WorkspaceShell";
import { getWorkspaceAccessContext } from "@/features/admin/workspaces/services/workspace-access";
import { createDefaultFormForWorkspaceAction } from "@/features/typeform/actions/create-default-form-for-workspace.action";
import { getWorkspaceForms } from "@/features/typeform/services/typeform.service";

export default async function NewWorkspaceFormPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const { user, workspaces, workspace, canCreateForms } =
    await getWorkspaceAccessContext(workspaceId);

  if (!canCreateForms) {
    notFound();
  }

  const forms = await getWorkspaceForms(workspace.typeformId);
  const createDefaultForm = createDefaultFormForWorkspaceAction.bind(
    null,
    workspace.id,
  );

  return (
    <WorkspaceShell
      user={user}
      workspaces={workspaces}
      currentWorkspaceId={workspace.id}
      currentSection="forms"
    >
      <header className="border-b border-zinc-800/60 pb-6">
        <Link
          href={`/workspaces/${workspace.id}/forms`}
          className="inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-[#C8A96E]"
        >
          <LuArrowLeft className="size-4" />
          Volver a formularios
        </Link>

        <div className="mt-5 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
          <LuFilePlus2 className="size-3.5 text-[#C8A96E]" />
          <span>{workspace.name}</span>
        </div>

        <h1 className="mt-2 text-2xl font-bold text-white">Crear formulario</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Puedes usar cualquier formulario como base para crear una nueva version.
        </p>
      </header>

      {forms.items.length === 0 ? (
        <section className="mt-8 rounded-xl border border-zinc-800 bg-[#111113] p-6">
          <h2 className="text-base font-semibold text-white">Sin formularios base</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Este workspace no tiene formularios disponibles para duplicar.
          </p>

          <form action={createDefaultForm} className="mt-5">
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#C8A96E] px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-[#d7b87b]"
            >
              <LuFilePlus2 className="size-4" />
              Crear formulario base ahora
            </button>
          </form>
        </section>
      ) : (
        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {forms.items.map((form) => (
            <Link
              key={form.id}
              href={`/workspaces/${workspace.id}/forms/${form.id}`}
              className="rounded-xl border border-zinc-800 bg-[#111113] p-5 transition hover:border-[#C8A96E]/50"
            >
              <h2 className="truncate text-base font-semibold text-white">
                {form.title}
              </h2>
              <p className="mt-2 truncate text-xs text-zinc-500">ID: {form.id}</p>
              <p className="mt-4 text-sm font-medium text-[#C8A96E]">
                Usar como base
              </p>
            </Link>
          ))}
        </section>
      )}
    </WorkspaceShell>
  );
}
