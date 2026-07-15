import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import {
  getWorkspaceAccessContext,
} from "@/features/admin/workspaces/services/workspace-access";
import { WorkspaceFormResponsesHeader } from "@/features/typeform/components/responses/WorkspaceFormResponsesHeader";
import { WorkspaceFormResponsesStats } from "@/features/typeform/components/responses/WorkspaceFormResponsesStats";
import { WorkspaceFormResponsesList } from "@/features/typeform/components/responses/WorkspaceFormResponsesList";
import { selectWinnersAction } from "@/features/typeform/actions/select-winners.action";
import { WinnerSelectionPanel } from "@/features/typeform/components/responses/WinnerSelectionPanel";
import {
  formBelongsToWorkspace,
  getTypeformForm,
  getTypeformFormResponses,
  mapMaskedTypeformResponses,
  resolveWorkspaceTypeformId,
} from "@/features/typeform/services/typeform.service";
import { createAuditLog } from "@/features/admin/audit/services/audit-log.service";

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
  const { user, workspace } = await getWorkspaceAccessContext(workspaceId);
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
    <>
      <WorkspaceFormResponsesHeader
        workspaceId={workspace.id}
        workspaceName={workspace.name}
        formId={form.id}
        formTitle={form.title}
      />

      <WorkspaceFormResponsesStats
        totalParticipants={responses.total_items}
        shownParticipants={maskedResponses.length}
        maskedAnswerCount={maskedAnswerCount}
      />

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
        <WorkspaceFormResponsesList
          responses={maskedResponses}
          revealedWinnerTokens={revealedWinnerTokens}
          currentPage={currentPage}
          totalPages={responses.page_count}
          totalItems={responses.total_items}
          itemsPerPage={itemsPerPage}
        />
      )}
    </>
  );
}
