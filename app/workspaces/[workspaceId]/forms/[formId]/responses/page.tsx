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
  getTypeformResponseParticipantEmail,
  isTypeformNotFoundError,
  mapMaskedTypeformResponses,
  resolveWorkspaceTypeformId,
} from "@/features/typeform/services/typeform.service";
import { createAuditLog } from "@/features/admin/audit/services/audit-log.service";
import { prisma } from "@/lib/prisma";

const WINNER_CANDIDATES_PAGE_SIZE = 100;

const REGION_ALIASES = [
  {
    name: "Arica y Parinacota",
    aliases: ["arica", "parinacota"],
  },
  {
    name: "Tarapacá",
    aliases: ["tarapaca", "iquique"],
  },
  {
    name: "Antofagasta",
    aliases: ["antofagasta"],
  },
  {
    name: "Atacama",
    aliases: ["atacama", "copiapo"],
  },
  {
    name: "Coquimbo",
    aliases: ["coquimbo", "la serena"],
  },
  {
    name: "Valparaíso",
    aliases: ["valparaiso", "valpo"],
  },
  {
    name: "Región Metropolitana",
    aliases: ["rm", "metropolitana", "santiago"],
  },
  {
    name: "O'Higgins",
    aliases: ["ohiggins", "o higgins", "rancagua"],
  },
  {
    name: "Maule",
    aliases: ["maule", "talca"],
  },
  {
    name: "Ñuble",
    aliases: ["nuble", "chillan"],
  },
  {
    name: "Biobío",
    aliases: ["biobio", "bio bio", "bio-bio", "concepcion"],
  },
  {
    name: "La Araucanía",
    aliases: ["araucania", "temuco"],
  },
  {
    name: "Los Ríos",
    aliases: ["los rios", "valdivia"],
  },
  {
    name: "Los Lagos",
    aliases: ["los lagos", "puerto montt"],
  },
  {
    name: "Aysén",
    aliases: ["aysen", "aisen", "coyhaique"],
  },
  {
    name: "Magallanes",
    aliases: ["magallanes", "punta arenas"],
  },
] as const;

function normalizeText(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeRegion(value?: string) {
  if (!value?.trim()) return undefined;

  const normalizedValue = normalizeText(value);
  const match = REGION_ALIASES.find((region) =>
    region.aliases.some(
      (alias) => normalizedValue === alias || normalizedValue.includes(alias),
    ),
  );

  return match?.name ?? value.trim();
}

function normalizeComuna(value?: string) {
  return value?.trim() || undefined;
}

function getResponseSubmittedTime(response: {
  submitted_at?: string;
  landed_at?: string;
}) {
  const timestamp = Date.parse(
    response.submitted_at ?? response.landed_at ?? "",
  );

  return Number.isNaN(timestamp) ? 0 : timestamp;
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

  return {
    label: preferred?.value ?? `Participante ${index + 1}`,
  };
}

function getCandidateRegion(response: {
  answers: { question: string; value: string }[];
}) {
  const region = response.answers.find((answer) =>
    /región|region/i.test(answer.question),
  )?.value;

  return normalizeRegion(region);
}

function getCandidateComuna(response: {
  answers: { question: string; value: string }[];
}) {
  const comuna = response.answers.find((answer) =>
    /comuna|comune|municipio|municipality/i.test(answer.question),
  )?.value;

  return normalizeComuna(comuna);
}

function getCandidateEmail(response: {
  answers: { question: string; value: string; answerType?: string }[];
}) {
  return response.answers.find((answer) => {
    const question = answer.question.toLowerCase();

    return (
      answer.value !== "Sin respuesta" &&
      (answer.answerType === "email" || /correo|email|mail/.test(question))
    );
  })?.value;
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

function deduplicateByToken<T extends { token: string }>(items: T[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.token)) {
      return false;
    }

    seen.add(item.token);
    return true;
  });
}

function deduplicateByParticipantEmail<T extends { token: string }>(
  items: T[],
) {
  const seenEmails = new Set<string>();

  return items.filter((item) => {
    const email = getTypeformResponseParticipantEmail(item);

    if (!email) {
      return true;
    }

    if (seenEmails.has(email)) {
      return false;
    }

    seenEmails.add(email);
    return true;
  });
}

function getChronologicalParticipantResponses<
  T extends { token: string; submitted_at?: string; landed_at?: string },
>(items: T[]) {
  return deduplicateByParticipantEmail(
    [...items].sort((first, second) => {
      const dateDiff =
        getResponseSubmittedTime(first) - getResponseSubmittedTime(second);

      if (dateDiff !== 0) {
        return dateDiff;
      }

      return first.token.localeCompare(second.token);
    }),
  );
}

function getParticipantNumbersByToken<T extends { token: string }>(items: T[]) {
  return new Map(items.map((item, index) => [item.token, String(index + 1)]));
}

async function getWinnerCandidateResponses(formId: string) {
  const allResponses: Awaited<
    ReturnType<typeof getTypeformFormResponses>
  >["items"] = [];

  let before: string | undefined;
  let expectedTotal: number | null = null;

  while (true) {
    const pageResult = await getTypeformFormResponses(formId, {
      pageSize: WINNER_CANDIDATES_PAGE_SIZE,
      before,
    });

    if (expectedTotal === null) {
      expectedTotal = pageResult.total_items;
    }

    if (pageResult.items.length === 0) {
      break;
    }

    allResponses.push(...pageResult.items);

    if (pageResult.items.length < WINNER_CANDIDATES_PAGE_SIZE) {
      break;
    }

    if (expectedTotal !== null && allResponses.length >= expectedTotal) {
      break;
    }

    const lastToken = pageResult.items.at(-1)?.token;
    if (!lastToken || lastToken === before) {
      break;
    }

    before = lastToken;
  }

  return deduplicateByToken(allResponses);
}

async function getAllFormResponses(formId: string) {
  return getWinnerCandidateResponses(formId);
}

export default async function FormResponsesPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; formId: string }>;
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    winnerRegionFilter?: string;
    winnerSelection?: string;
    winnerError?: string;
  }>;
}) {
  const { workspaceId, formId } = await params;
  const { user, workspace } = await getWorkspaceAccessContext(workspaceId);
  const { page, pageSize, winnerRegionFilter, winnerSelection, winnerError } =
    await searchParams;

  const userWorkspaceMembership = await prisma.userWorkspace.findUnique({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId,
      },
    },
    select: {
      role: true,
    },
  });

  const canSelectWinners =
    user.globalRole === "SUPER_ADMIN" ||
    userWorkspaceMembership?.role === "EDITOR" ||
    workspace.role === "EDITOR";
  const canExportResponses = workspace.role === "EDITOR";
  const currentPage = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
  const showAllResponses = (pageSize ?? "").toLowerCase() === "all";
  const requestedPageSize = Number.parseInt(pageSize ?? "20", 10) || 20;
  const selectedItemsPerPage = [10, 20, 50, 100].includes(requestedPageSize)
    ? requestedPageSize
    : 20;
  const form = await getExistingTypeformForm(formId);

  const localForm = await prisma.form.findUnique({
    where: { typeformId: form.id },
    select: { id: true },
  });

  const persistedWinnerTokens = new Set<string>();
  const persistedWinnerRows = localForm
    ? await prisma.formWinner.findMany({
        where: {
          formId: localForm.id,
          workspaceId: workspace.id,
        },
        select: {
          responseToken: true,
          participantEmail: true,
          reason: true,
          selectedByUserId: true,
        },
      })
    : [];

  for (const winner of persistedWinnerRows) {
    persistedWinnerTokens.add(winner.responseToken);
  }

  const winnerContactsByToken = Object.fromEntries(
    persistedWinnerRows.flatMap((winner) =>
      winner.participantEmail
        ? [[winner.responseToken, winner.participantEmail] as const]
        : [],
    ),
  );

  const winnerCookieName = `winner_selection:${workspace.id}:${form.id}`;
  const winnerCookieRaw = (await cookies()).get(winnerCookieName)?.value;
  let revealedWinnerTokens = new Set<string>(persistedWinnerTokens);
  let winnerSelectionReason: string | null = null;

  if (winnerCookieRaw && persistedWinnerTokens.size === 0) {
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

  const allResponses = await getAllFormResponses(form.id);
  const chronologicalParticipantResponses =
    getChronologicalParticipantResponses(allResponses);
  const participantNumbersByToken = getParticipantNumbersByToken(
    chronologicalParticipantResponses,
  );
  const canonicalParticipantTokens = new Set(participantNumbersByToken.keys());
  const rawResponses = showAllResponses
    ? {
        page_count: 1,
        total_items: chronologicalParticipantResponses.length,
        items: chronologicalParticipantResponses,
      }
    : await getTypeformFormResponses(form.id, {
        page: currentPage,
        pageSize: selectedItemsPerPage,
      });
  const visibleResponseItems = rawResponses.items.filter((response) =>
    canonicalParticipantTokens.has(response.token),
  );
  const responses = {
    ...rawResponses,
    items: visibleResponseItems,
    total_items: chronologicalParticipantResponses.length,
  };
  const itemsPerPage = showAllResponses
    ? Math.max(1, responses.total_items)
    : selectedItemsPerPage;
  const totalResponsePages = Math.max(1, responses.page_count);
  const isPageOutOfRange =
    responses.total_items > 0 && currentPage > totalResponsePages;
  const winnerCandidateResponses =
    canSelectWinners && !isPageOutOfRange
      ? showAllResponses
        ? chronologicalParticipantResponses
        : deduplicateByToken(await getWinnerCandidateResponses(form.id)).filter(
            (response) => canonicalParticipantTokens.has(response.token),
          )
      : [];

  const selectWinners = selectWinnersAction.bind(null, workspace.id, form.id);
  const maskedResponses = mapMaskedTypeformResponses(form, responses.items, {
    maskSensitive: true,
    unmaskTokens: revealedWinnerTokens,
  }).map((response) => ({
    ...response,
    participantNumber:
      participantNumbersByToken.get(response.token) ??
      response.participantNumber,
  }));
  const maskedWinnerCandidateResponses = mapMaskedTypeformResponses(
    form,
    winnerCandidateResponses,
    {
      maskSensitive: true,
      unmaskTokens: revealedWinnerTokens,
    },
  ).map((response) => ({
    ...response,
    participantNumber:
      participantNumbersByToken.get(response.token) ??
      response.participantNumber,
  }));
  const highlightedWinnerResponses = maskedWinnerCandidateResponses.filter(
    (response) => revealedWinnerTokens.has(response.token),
  );
  const revealedResponses = maskedResponses.filter((response) =>
    revealedWinnerTokens.has(response.token),
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
        formTitle={form.title}
      />

      <WorkspaceFormResponsesStats
        totalParticipants={responses.total_items}
        shownParticipants={maskedResponses.length}
        selectedWinnersCount={revealedWinnerTokens.size}
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
            initialRegionFilter={winnerRegionFilter}
            itemsPerPage={itemsPerPage}
            pageSizeValue={showAllResponses ? "all" : String(itemsPerPage)}
            winnerSelection={winnerSelection}
            winnerError={winnerError}
            candidates={maskedWinnerCandidateResponses.map(
              (response, index) => {
                const { label } = getWinnerLabel(response, index);
                const participantNumber =
                  participantNumbersByToken.get(response.token) ??
                  String(index + 1);

                return {
                  token: response.token,
                  label,
                  detail: `#${participantNumber}`,
                  participantNumber,
                  email: getCandidateEmail(response),
                  region: getCandidateRegion(response),
                  comuna: getCandidateComuna(response),
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
            Typeform no devolvió participantes para este formulario.
          </p>
        </section>
      ) : !isPageOutOfRange ? (
        <WorkspaceFormResponsesList
          highlightedResponses={highlightedWinnerResponses}
          highlightedContactsByToken={winnerContactsByToken}
          responses={maskedResponses}
          currentPage={currentPage}
          totalPages={totalResponsePages}
          totalItems={responses.total_items}
          itemsPerPage={itemsPerPage}
          exportBaseHref={`/workspaces/${workspace.id}/forms/${form.id}/responses/export`}
          canExportResponses={canExportResponses}
        />
      ) : null}
    </>
  );
}
