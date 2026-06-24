import { notFound } from "next/navigation";
import Link from "next/link";
import { LuArrowLeft, LuExternalLink, LuFilePlus2, LuFileText, LuInbox } from "react-icons/lu";
import { WorkspaceShell } from "@/features/admin/workspaces/components/WorkspaceShell";
import { getWorkspaceAccessContext } from "@/features/admin/workspaces/services/workspace-access";
import { duplicateFormAction } from "@/features/typeform/actions/duplicate-form.action";
import {
  formBelongsToWorkspace,
  getTypeformForm,
} from "@/features/typeform/services/typeform.service";
import { CopyButton } from "@/shared/components/CopyButton";

export default async function WorkspaceFormDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; formId: string }>;
  searchParams: Promise<{ clonedFrom?: string }>;
}) {
  const { workspaceId, formId } = await params;
  const { clonedFrom } = await searchParams;
  const { user, workspaces, workspace, canCreateForms } =
    await getWorkspaceAccessContext(workspaceId);
  const form = await getTypeformForm(formId);

  if (!formBelongsToWorkspace(form, workspace.typeformId)) {
    notFound();
  }

  const displayUrl = form._links?.display;
  const duplicateForm = duplicateFormAction.bind(null, workspace.id, form.id);

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

        <div className="mt-5 flex items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
              <LuFileText className="size-3.5 text-[#C8A96E]" />
              <span>{workspace.name}</span>
            </div>

            <h1 className="mt-2 truncate text-2xl font-bold text-white">
              {form.title}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">Formulario autorizado</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/workspaces/${workspace.id}/forms/${form.id}/responses`}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 transition hover:border-[#C8A96E] hover:text-[#C8A96E]"
            >
              Ver respuestas
              <LuInbox className="size-4" />
            </Link>

            {displayUrl && (
              <a
                href={displayUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 transition hover:border-[#C8A96E] hover:text-[#C8A96E]"
              >
                Abrir Typeform
                <LuExternalLink className="size-4" />
              </a>
            )}
          </div>
        </div>
      </header>

      {clonedFrom && (
        <section className="mt-8 rounded-xl border border-[#C8A96E]/40 bg-[#15130e] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#C8A96E]">
                Formulario clonado
              </p>
              <h2 className="mt-2 text-lg font-semibold text-white">
                Nuevo Typeform creado correctamente
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Base utilizada: {clonedFrom}
              </p>
            </div>

            <CopyButton value={form.id} />
          </div>
        </section>
      )}

      
      {canCreateForms && (
        <section className="mt-6 rounded-xl border border-zinc-800 bg-[#111113] p-5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
            <LuFilePlus2 className="size-3.5 text-[#C8A96E]" />
            <span>Duplicacion</span>
          </div>

          <h2 className="mt-2 text-base font-semibold text-white">
            Crear nuevo formulario desde esta base
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Se copiara la estructura del formulario, eliminando los campos id antes de crear el nuevo Typeform.
          </p>

          <form action={duplicateForm} className="mt-5 flex flex-col gap-3 md:flex-row">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Nombre del nuevo formulario</span>
              <input
                name="title"
                type="text"
                required
                defaultValue={`Copia de ${form.title}`}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#C8A96E]"
              />
            </label>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#C8A96E] px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-[#d7b87b]"
            >
              <LuFilePlus2 className="size-4" />
              Duplicar
            </button>
          </form>
        </section>
      )}

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-zinc-800 bg-[#111113] p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Typeform ID
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
            <code className="truncate text-sm text-zinc-200">{form.id}</code>
            <CopyButton value={form.id} label="Copiar" />
          </div>
        </article>

        <article className="rounded-xl border border-zinc-800 bg-[#111113] p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Campos
          </p>
          <p className="mt-3 text-2xl font-bold text-white">
            {form.fields?.length ?? 0}
          </p>
        </article>

        <article className="rounded-xl border border-zinc-800 bg-[#111113] p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Hidden fields
          </p>
          <p className="mt-3 text-2xl font-bold text-white">
            {form.hidden?.length ?? 0}
          </p>
        </article>
      </section>


      <section className="mt-6 rounded-xl border border-zinc-800 bg-[#111113] p-5">
        <h2 className="text-base font-semibold text-white">Estructura detectada</h2>
        <div className="mt-4 grid gap-3 text-sm text-zinc-400 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            Welcome screens: {form.welcome_screens?.length ?? 0}
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            Thank-you screens: {form.thankyou_screens?.length ?? 0}
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            Reglas de logica: {form.logic?.length ?? 0}
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            Estado: {form.settings?.is_public === false ? "Privado" : "Publico"}
          </div>
        </div>
      </section>
    </WorkspaceShell>
  );
}
