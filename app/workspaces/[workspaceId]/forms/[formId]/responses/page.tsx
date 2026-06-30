import { notFound } from "next/navigation";
import Link from "next/link";
import {
  LuArrowLeft,
  LuCalendarClock,
  LuEyeOff,
  LuInbox,
  LuShieldCheck,
} from "react-icons/lu";
import { WorkspaceShell } from "@/features/admin/workspaces/components/WorkspaceShell";
import { getWorkspaceAccessContext } from "@/features/admin/workspaces/services/workspace-access";
import {
  formBelongsToWorkspace,
  getTypeformForm,
  getTypeformFormResponses,
  mapMaskedTypeformResponses,
} from "@/features/typeform/services/typeform.service";
import { createAuditLog } from "@/features/admin/audit/services/audit-log.service";

function formatDate(value?: string) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function FormResponsesPage({
  params,
}: {
  params: Promise<{ workspaceId: string; formId: string }>;
}) {
  const { workspaceId, formId } = await params;
  const { user, workspaces, workspace } =
    await getWorkspaceAccessContext(workspaceId);
  const form = await getTypeformForm(formId);

  if (!formBelongsToWorkspace(form, workspace.typeformId)) {
    notFound();
  }

  const responses = await getTypeformFormResponses(form.id);
  const maskedResponses = mapMaskedTypeformResponses(form, responses.items);
  const maskedAnswerCount = maskedResponses.reduce(
    (total, response) =>
      total +
      response.answers.filter((answer) => answer.masked).length +
      response.hidden.length,
    0,
  );

  await createAuditLog({
    action: "SENSITIVE_DATA_VIEWED",
    actor: user,
    target: { type: "form_responses", id: form.id },
    context: {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      formId: form.id,
      formTitle: form.title,
      metadata: {
        totalResponses: responses.total_items,
        displayedResponses: maskedResponses.length,
        maskedAnswerCount,
      },
    },
  });

  return (
    <WorkspaceShell
      user={user}
      workspaces={workspaces}
      currentWorkspaceId={workspace.id}
      currentSection="responses"
    >
      <header className="border-b border-zinc-800/60 pb-6">
        <Link
          href={`/workspaces/${workspace.id}/responses`}
          className="inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-[#C8A96E]"
        >
          <LuArrowLeft className="size-4" />
          Volver a respuestas
        </Link>

        <div className="mt-5 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
          <LuInbox className="size-3.5 text-[#C8A96E]" />
          <span>{workspace.name}</span>
        </div>

        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold text-white">
              Respuestas de {form.title}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Participantes recuperados desde Typeform con datos sensibles enmascarados.
            </p>
          </div>

          <Link
            href={`/workspaces/${workspace.id}/forms/${form.id}`}
            className="inline-flex items-center rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 transition hover:border-[#C8A96E] hover:text-[#C8A96E]"
          >
            Ver formulario
          </Link>
        </div>
      </header>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-zinc-800 bg-[#111113] p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Participantes
          </p>
          <p className="mt-3 text-2xl font-bold text-white">
            {responses.total_items}
          </p>
        </article>

        <article className="rounded-xl border border-zinc-800 bg-[#111113] p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Mostrados
          </p>
          <p className="mt-3 text-2xl font-bold text-white">
            {maskedResponses.length}
          </p>
        </article>

        <article className="rounded-xl border border-[#C8A96E]/40 bg-[#15130e] p-5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#C8A96E]">
            <LuShieldCheck className="size-3.5" />
            <span>Proteccion activa</span>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">
            {maskedAnswerCount}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Campos ocultados</p>
        </article>
      </section>

      {maskedResponses.length === 0 ? (
        <section className="mt-8 rounded-xl border border-zinc-800 bg-[#111113] p-6">
          <h2 className="text-base font-semibold text-white">Sin respuestas</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Typeform no devolvio participantes para este formulario.
          </p>
        </section>
      ) : (
        <section className="mt-8 space-y-4">
          {maskedResponses.map((response) => (
            <article
              key={response.token}
              className="rounded-xl border border-zinc-800 bg-[#111113] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800 pb-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    Participante {response.token}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
                    <span className="inline-flex items-center gap-1.5">
                      <LuCalendarClock className="size-3.5" />
                      Enviado: {formatDate(response.submittedAt)}
                    </span>
                    <span>Llegada: {formatDate(response.landedAt)}</span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 px-2 py-1 text-xs text-zinc-400">
                  <LuEyeOff className="size-3.5 text-[#C8A96E]" />
                  Datos sensibles ocultos
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {[...response.answers, ...response.hidden].map((answer) => (
                  <div
                    key={`${response.token}-${answer.id}`}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                        {answer.question}
                      </p>
                      {answer.masked && (
                        <LuEyeOff className="size-3.5 shrink-0 text-[#C8A96E]" />
                      )}
                    </div>
                    <p className="mt-2 wrap-break-word text-sm text-zinc-200">
                      {answer.value}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}
    </WorkspaceShell>
  );
}