import { notFound } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  LuArrowLeft,
  LuCalendarClock,
  LuEyeOff,
  LuInbox,
  LuShieldCheck,
} from "react-icons/lu";
import { WorkspaceShell } from "@/features/admin/workspaces/components/WorkspaceShell";
import { getWorkspaceAccessContext } from "@/features/admin/workspaces/services/workspace-access";
import Pagination from "@/shared/components/Pagination";
import { selectWinnersAction } from "@/features/typeform/actions/select-winners.action";
import { WinnerSelectionPanel } from "@/features/typeform/components/WinnerSelectionPanel";
import {
  formBelongsToWorkspace,
  getTypeformForm,
  getTypeformFormResponses,
  mapMaskedTypeformResponses,
  resolveWorkspaceTypeformId,
} from "@/features/typeform/services/typeform.service";
import { createAuditLog } from "@/features/admin/audit/services/audit-log.service";

function formatDate(value?: string) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getWinnerLabel(
  response: {
    token: string;
    answers: { question: string; value: string }[];
  },
  index: number,
) {
  const preferred = response.answers.find((answer) => {
    const question = answer.question.toLowerCase();
    return (
      /nombre|correo|email|rut/.test(question) &&
      answer.value !== "Sin respuesta"
    );
  });

  const shortToken = response.token.slice(-6);

  return {
    label: preferred?.value ?? `Participante ${index + 1}`,
    detail: `Ref ${shortToken}`,
  };
}

export default async function FormResponsesPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; formId: string }>;
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    winnerSelection?: string;
    winnerError?: string;
  }>;
}) {
  const { workspaceId, formId } = await params;
  const { page, pageSize, winnerSelection, winnerError } = await searchParams;
  const { user, workspaces, workspace } =
    await getWorkspaceAccessContext(workspaceId);
  const canSelectWinners =
    user.globalRole === "SUPER_ADMIN" || workspace.role === "EDITOR";
  const currentPage = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
  const requestedPageSize = Number.parseInt(pageSize ?? "20", 10) || 20;
  const itemsPerPage = [10, 20, 50, 100].includes(requestedPageSize)
    ? requestedPageSize
    : 20;
  const form = await getTypeformForm(formId);
  const winnerCookieName = `winner_selection:${workspace.id}:${form.id}`;
  const winnerCookieRaw = (await cookies()).get(winnerCookieName)?.value;
  let revealedWinnerTokens = new Set<string>();
  let winnerSelectionReason: string | null = null;

  if (winnerCookieRaw) {
    try {
      const parsed = JSON.parse(winnerCookieRaw) as {
        tokens?: string[];
        by?: string;
        reason?: string;
      };

      if (parsed.by === user.id) {
        revealedWinnerTokens = new Set(parsed.tokens ?? []);
        winnerSelectionReason = parsed.reason ?? null;
      }
    } catch {
      revealedWinnerTokens = new Set();
    }
  }

  const resolvedWorkspaceTypeformId = await resolveWorkspaceTypeformId(
    workspace.typeformId,
  );

  if (!formBelongsToWorkspace(form, resolvedWorkspaceTypeformId)) {
    notFound();
  }

  const responses = await getTypeformFormResponses(form.id, {
    page: currentPage,
    pageSize: itemsPerPage,
  });

  const selectWinners = selectWinnersAction.bind(null, workspace.id, form.id);
  const maskedResponses = mapMaskedTypeformResponses(form, responses.items, {
    maskSensitive: true,
    unmaskTokens: revealedWinnerTokens,
  });
  const revealedResponses = maskedResponses.filter((response) =>
    revealedWinnerTokens.has(response.token),
  );
  const maskedAnswerCount = maskedResponses.reduce(
    (total, response) =>
      total +
      response.answers.filter((answer) => answer.masked).length +
      response.hidden.filter((answer) => answer.masked).length,
    0,
  );

  if (revealedResponses.length > 0) {
    await createAuditLog({
      action: "SENSITIVE_DATA_VIEWED",
      actor: user,
      target: { type: "form_winner_data", id: form.id },
      context: {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        formId: form.id,
        formTitle: form.title,
        metadata: {
          displayedResponses: revealedResponses.length,
          revealedTokens: revealedResponses
            .map((response) => response.token)
            .join(","),
          reason: winnerSelectionReason,
          scope: "winner_selection_flow",
        },
      },
    });
  }

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
          <LuInbox className="size-3.5 text-[#C8A96E]" />
          <span>{workspace.name}</span>
        </div>

        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold text-white">
              Respuestas de {form.title}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Participantes recuperados desde Typeform con datos sensibles
              enmascarados.
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
            <span>Protección activa</span>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">
            {maskedAnswerCount}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Campos ocultados
          </p>
        </article>
      </section>

      {canSelectWinners && maskedResponses.length > 0 && (
        <WinnerSelectionPanel
          action={selectWinners}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          winnerSelection={winnerSelection}
          winnerError={winnerError}
          candidates={maskedResponses.map((response, index) => {
            const { label, detail } = getWinnerLabel(response, index);

            return {
              token: response.token,
              label,
              detail,
              selected: revealedWinnerTokens.has(response.token),
            };
          })}
        />
      )}

      {maskedResponses.length === 0 ? (
        <section className="mt-8 rounded-xl border border-zinc-800 bg-[#111113] p-6">
          <h2 className="text-base font-semibold text-white">Sin respuestas</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Typeform no devolvio participantes para este formulario.
          </p>
        </section>
      ) : (
        <section className="mt-8 space-y-4">
          <Pagination
            currentPage={Math.min(
              currentPage,
              Math.max(1, responses.page_count),
            )}
            totalPages={Math.max(1, responses.page_count)}
            totalItems={responses.total_items}
            itemsPerPage={itemsPerPage}
            itemLabel="participantes"
            showPageSizeSelector
          />

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
                  {revealedWinnerTokens.has(response.token)
                    ? "Ganador visible por selección"
                    : "Datos sensibles ocultos"}
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

          <Pagination
            currentPage={Math.min(
              currentPage,
              Math.max(1, responses.page_count),
            )}
            totalPages={Math.max(1, responses.page_count)}
            totalItems={responses.total_items}
            itemsPerPage={itemsPerPage}
            itemLabel="participantes"
            showPageSizeSelector
          />
        </section>
      )}
    </WorkspaceShell>
  );
}
