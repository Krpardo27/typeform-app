import { notFound } from "next/navigation";
import Link from "next/link";
import { LuArrowLeft, LuExternalLink, LuFileText, LuInbox } from "react-icons/lu";
import { WorkspaceShell } from "@/features/admin/workspaces/components/WorkspaceShell";
import { getWorkspaceAccessContext } from "@/features/admin/workspaces/services/workspace-access";
import { duplicateFormAction } from "@/features/typeform/actions/duplicate-form.action";
import { DuplicateFormPanel } from "@/features/typeform/components/DuplicateFormPanel";
import NewWorkspaceFormPage from "../new/page";
import {
  formBelongsToWorkspace,
  getTypeformForm,
  resolveWorkspaceTypeformId,
} from "@/features/typeform/services/typeform.service";
import { CopyButton } from "@/shared/components/CopyButton";

function getSuggestedDuplicateTitle(title: string) {
  const normalized = title.trim();
  const numberedMatch = normalized.match(/^(.*)\s\((\d+)\)$/);

  if (numberedMatch) {
    const baseTitle = numberedMatch[1]?.trim();
    const currentNumber = Number(numberedMatch[2]);

    if (baseTitle && Number.isFinite(currentNumber)) {
      return `${baseTitle} (${currentNumber + 1})`;
    }
  }

  return `${normalized} (2)`;
}

export default async function WorkspaceFormDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; formId: string }>;
  searchParams: Promise<{ clonedFrom?: string; page?: string; pageSize?: string }>;
}) {
  const { workspaceId, formId } = await params;
  const { clonedFrom, page, pageSize } = await searchParams;

  if (formId === "new") {
    return (
      <NewWorkspaceFormPage
        params={Promise.resolve({ workspaceId })}
        searchParams={Promise.resolve({ page, pageSize })}
      />
    );
  }

  const { user, workspaces, workspace, canCreateForms } =
    await getWorkspaceAccessContext(workspaceId);
  const form = await getTypeformForm(formId);
  const resolvedWorkspaceTypeformId = await resolveWorkspaceTypeformId(
    workspace.typeformId,
  );

  if (!formBelongsToWorkspace(form, resolvedWorkspaceTypeformId)) {
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

      
      {canCreateForms && (
        <DuplicateFormPanel
          action={duplicateForm}
          defaultTitle={getSuggestedDuplicateTitle(form.title)}
          clonedFrom={clonedFrom}
        />
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
            Pantallas de bienvenida: {form.welcome_screens?.length ?? 0}
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            Pantallas de agradecimiento: {form.thankyou_screens?.length ?? 0}
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            Reglas de lógica: {form.logic?.length ?? 0}
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            Estado: {form.settings?.is_public === false ? "Privado" : "Público"}
          </div>
        </div>
      </section>
    </WorkspaceShell>
  );
}
