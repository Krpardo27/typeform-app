import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { getWorkspaceAccessContext } from "@/features/admin/workspaces/services/workspace-access";
import { WorkspaceFormResponsesHeader } from "@/features/typeform/components/responses/WorkspaceFormResponsesHeader";
import { WorkspaceFormResponsesStats } from "@/features/typeform/components/responses/WorkspaceFormResponsesStats";
import { WorkspaceFormResponsesList } from "@/features/typeform/components/responses/WorkspaceFormResponsesList";
import { selectWinnersAction } from "@/features/typeform/actions/select-winners.action";
import { WinnerSelectionPanel } from "@/features/typeform/components/responses/WinnerSelectionPanel";
import {
  formBelongsToWorkspace,
  getTypeformForm,
  getTypeformFormResponses,
  isTypeformNotFoundError,
  mapMaskedTypeformResponses,
  resolveWorkspaceTypeformId,
} from "@/features/typeform/services/typeform.service";
import { createAuditLog } from "@/features/admin/audit/services/audit-log.service";

const WINNER_CANDIDATES_PAGE_SIZE = 100;

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

  return {
    label: preferred?.value ?? `Participante ${index + 1}`,
  };
}

function normalizeParticipantNumber(value: string) {
  return value.replace(/^#/, "").trim();
}

function getResponseParticipantNumber(
  response: {
    hidden?: Record<string, string>;
  },
  fallback: number,
) {
  const hiddenEntries = Object.entries(response.hidden ?? {});
  const numericHiddenEntries = hiddenEntries
    .map(
      ([key, value]) =>
        [key, normalizeParticipantNumber(String(value))] as const,
    )
    .filter(([, value]) => /^\d+$/.test(value));

  const preferredEntry = numericHiddenEntries.find(([key]) =>
    /participante|participant|numero|número|nro|folio|codigo|código/i.test(key),
  );

  return (
    preferredEntry?.[1] ?? numericHiddenEntries[0]?.[1] ?? String(fallback)
  );
}

async function getExistingTypeformForm(formId: string) {
  try {
    return await getTypeformForm(formId);
  } catch (error) {
    if (isTypeformNotFoundError(error)) {
      notFound();
    }

    throw error;
  }
}

async function getWinnerCandidateResponses(formId: string) {
  const firstPage = await getTypeformFormResponses(formId, {
    page: 1,
    pageSize: WINNER_CANDIDATES_PAGE_SIZE,
  });

  if (firstPage.page_count <= 1) {
    return firstPage.items;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.page_count - 1 }, (_, index) =>
      getTypeformFormResponses(formId, {
        page: index + 2,
        pageSize: WINNER_CANDIDATES_PAGE_SIZE,
      }),
    ),
  );

  return [firstPage, ...remainingPages].flatMap(
    (pageResult) => pageResult.items,
  );
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
  const form = await getExistingTypeformForm(formId);
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
  const totalResponsePages = Math.max(1, responses.page_count);
  const isPageOutOfRange =
    responses.total_items > 0 && currentPage > totalResponsePages;
  const winnerCandidateResponses =
    canSelectWinners && !isPageOutOfRange
      ? await getWinnerCandidateResponses(form.id)
      : [];

  const selectWinners = selectWinnersAction.bind(null, workspace.id, form.id);
  const maskedResponses = mapMaskedTypeformResponses(form, responses.items, {
    maskSensitive: true,
    unmaskTokens: revealedWinnerTokens,
  });
  const maskedWinnerCandidateResponses = mapMaskedTypeformResponses(
    form,
    winnerCandidateResponses,
    {
      maskSensitive: true,
      unmaskTokens: revealedWinnerTokens,
    },
  );
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

      {isPageOutOfRange && (
        <section className="mt-8 rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-base font-semibold text-gray-900">
            Página fuera de rango
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            La página {currentPage} no existe para este formulario. Actualmente
            hay {totalResponsePages} página
            {totalResponsePages === 1 ? "" : "s"} de participantes.
          </p>

          <Link
            href={`/workspaces/${workspace.id}/forms/${form.id}/responses?pageSize=${itemsPerPage}&page=${totalResponsePages}`}
            className="mt-4 inline-flex rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            Ir a la última página válida
          </Link>
        </section>
      )}

      {!isPageOutOfRange &&
        canSelectWinners &&
        maskedWinnerCandidateResponses.length > 0 && (
          <WinnerSelectionPanel
            action={selectWinners}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            winnerSelection={winnerSelection}
            winnerError={winnerError}
            candidates={maskedWinnerCandidateResponses.map(
              (response, index) => {
                const { label } = getWinnerLabel(response, index);
                const fallbackParticipantNumber = index + 1;
                const participantNumber = getResponseParticipantNumber(
                  winnerCandidateResponses[index] ?? {},
                  fallbackParticipantNumber,
                );

                return {
                  token: response.token,
                  label,
                  detail: `#${participantNumber}`,
                  participantNumber,
                  selected: revealedWinnerTokens.has(response.token),
                };
              },
            )}
          />
        )}

      {!isPageOutOfRange && maskedResponses.length === 0 ? (
        <section className="mt-8 rounded-xl border border-[#F5F5F5] bg-[#FFFFFF] p-6">
          <h2 className="text-base font-semibold text-[#000000]">
            Sin respuestas
          </h2>
          <p className="mt-1 text-sm text-[#000000]/55">
            Typeform no devolvio participantes para este formulario.
          </p>
        </section>
      ) : !isPageOutOfRange ? (
        <WorkspaceFormResponsesList
          responses={maskedResponses}
          revealedWinnerTokens={Array.from(revealedWinnerTokens)}
          currentPage={currentPage}
          totalPages={totalResponsePages}
          totalItems={responses.total_items}
          itemsPerPage={itemsPerPage}
        />
      ) : null}
    </>
  );
}
