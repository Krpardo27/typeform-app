import { createHash } from "node:crypto";
import { notFound } from "next/navigation";
import Link from "next/link";
import { LuArrowUpRight } from "react-icons/lu";
import { getWorkspaceRenderContext } from "@/features/admin/workspaces/services/workspace-access";
import { WorkspaceFormResponsesHeader } from "@/features/typeform/components/responses/WorkspaceFormResponsesHeader";
import { WorkspaceFormResponsesStats } from "@/features/typeform/components/responses/WorkspaceFormResponsesStats";
import { confirmWinnersForRevealAction } from "@/features/typeform/actions/select-winners.action";
import {
  beginSavedWinnerDataAction,
  readWinnerDataAction,
  finishWinnerDataAction,
} from "@/features/typeform/actions/winner-reveal.action";
import { WinnerSelectionPanel } from "@/features/typeform/components/responses/WinnerSelectionPanel";
import {
  formBelongsToWorkspace,
  getTypeformForm,
  getTypeformResponseParticipantEmail,
  isTypeformNotFoundError,
  resolveWorkspaceTypeformId,
  type TypeformFormDetail,
  type TypeformResponseItem,
} from "@/features/typeform/services/typeform.service";
import { prisma } from "@/lib/prisma";
import { loadFormResponses } from "@/features/typeform/services/load-form-responses";
import { getEmbedInfo } from "@/features/typeform/utils/embed-info";
import { usesTypeformResponseFixtures } from "@/features/typeform/services/typeform-fixture-mode";

function getResponseSubmittedTime(response: {
  submitted_at?: string;
  landed_at?: string;
}) {
  const timestamp = Date.parse(
    response.submitted_at ?? response.landed_at ?? "",
  );

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

async function getCandidateProfiles(
  form: TypeformFormDetail,
  responses: TypeformResponseItem[],
) {
  // Esta extracción se ejecuta solo en el servidor y después de autorizar.
  // Mantener las dependencias del servicio fuera del módulo cliente de utils.
  const [{ getWinnerCandidateProfiles, maskWinnerCandidateProfile }, { mapMaskedTypeformResponses }] = await Promise.all([
    import("@/features/typeform/components/responses/winner-selection/utils"),
    import("@/features/typeform/services/typeform.service"),
  ]);
  const profiles = getWinnerCandidateProfiles(
    form,
    responses,
    mapMaskedTypeformResponses,
  );
  return new Map([...profiles].map(([token, profile]) => [token, maskWinnerCandidateProfile(profile)]));
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
  const { user, workspace } = await getWorkspaceRenderContext(workspaceId);
  const { winnerRegionFilter, winnerSelection, winnerError } =
    await searchParams;

  const [userWorkspaceMembership, form, resolvedWorkspaceTypeformId] = await Promise.all([
    prisma.userWorkspace.findUnique({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId: workspace.id,
        },
      },
      select: {
        role: true,
      },
    }),
    getExistingTypeformForm(formId),
    resolveWorkspaceTypeformId(workspace.typeformId),
  ]);

  if (user.globalRole !== "SUPER_ADMIN" && !userWorkspaceMembership) notFound();
  const canSelectWinners =
    user.globalRole === "SUPER_ADMIN" || userWorkspaceMembership?.role === "EDITOR";

  if (!formBelongsToWorkspace(form, resolvedWorkspaceTypeformId)) notFound();

  const localForm = await prisma.form.findUnique({
    where: { typeformId: form.id },
    select: { id: true, workspaceId: true },
  });

  if (localForm && localForm.workspaceId !== workspace.id) notFound();

  const persistedWinnerTokens = new Set<string>();
  const isFixturePreview = usesTypeformResponseFixtures(form.id);
  const persistedWinnerRows = localForm && !isFixturePreview
    ? await prisma.formWinner.findMany({
        where: {
          formId: localForm.id,
          workspaceId: workspace.id,
        },
        select: {
          responseToken: true,
          selectedAt: true,
        },
      })
    : [];

  for (const winner of persistedWinnerRows) {
    persistedWinnerTokens.add(winner.responseToken);
  }

  // Firma opaca, estable al reordenar filas y acotada al formulario local.
  // Los mocks/filas antiguos sin fecha usan null; nunca se proyectan fechas
  // ni motivos a los candidatos del cliente.
  const winnerRevision = createHash("sha256").update(JSON.stringify([
    workspace.id,
    form.id,
    localForm?.id ?? null,
    persistedWinnerRows.map(({ responseToken, selectedAt }) => [
      responseToken,
      selectedAt instanceof Date && Number.isFinite(selectedAt.getTime())
        ? selectedAt.toISOString()
        : null,
    ]).sort(([first], [second]) => (first ?? "").localeCompare(second ?? "")),
  ])).digest("hex");

  const allResponses = await loadFormResponses(form.id);
  const chronologicalParticipantResponses =
    getChronologicalParticipantResponses(allResponses);
  const participantNumbersByToken = getParticipantNumbersByToken(
    chronologicalParticipantResponses,
  );
  // Incluso los ganadores persistidos se proyectan enmascarados antes de
  // enviarlos al cliente. Solo el flujo explícito con grant permite revelarlos.
  const totalParticipants = chronologicalParticipantResponses.length;
  const winnerCandidateResponses = canSelectWinners
    ? deduplicateByToken([
        ...chronologicalParticipantResponses,
        // No retirar implícitamente un ganador persistido cuyo correo se
        // deduplicó: debe continuar visible para poder conservarlo o quitarlo.
        ...allResponses.filter((response) =>
          persistedWinnerTokens.has(response.token),
        ),
      ])
    : [];

  const selectWinners = confirmWinnersForRevealAction.bind(
    null,
    workspace.id,
    form.id,
  );
  const candidateProfiles = canSelectWinners
    ? await getCandidateProfiles(form, winnerCandidateResponses)
    : undefined;
  const embedInfo = getEmbedInfo(form.id, workspace.typeformId, undefined, workspace.templateFormTypeformId);
  const publicFormUrl = embedInfo.publicUrl ?? form._links?.display ?? embedInfo.src ?? `https://form.typeform.com/to/${encodeURIComponent(form.id)}`;
  const candidateTokens = new Set(winnerCandidateResponses.map((response) => response.token));
  const missingWinnerTokens = [...persistedWinnerTokens]
    .filter((token) => !candidateTokens.has(token))
    .sort();
  const showWinnerPanel = canSelectWinners &&
    (winnerCandidateResponses.length > 0 || persistedWinnerTokens.size > 0);

  return (
    <>
      <WorkspaceFormResponsesHeader
        workspaceId={workspace.id}
        workspaceName={workspace.name}
        formTitle={form.title}
      />

      <WorkspaceFormResponsesStats
        totalParticipants={totalParticipants}
        selectedWinnersCount={persistedWinnerTokens.size}
      />

      {showWinnerPanel && (
        <WinnerSelectionPanel
          action={selectWinners}
          beginWinnerData={beginSavedWinnerDataAction.bind(null, workspace.id, form.id)}
          currentPage={1}
          initialRegionFilter={winnerRegionFilter}
          itemsPerPage={Math.max(1, totalParticipants)}
          pageSizeValue="all"
          winnerSelection={winnerSelection}
          winnerRevision={winnerRevision}
          winnerError={winnerError}
          readWinnerData={readWinnerDataAction.bind(
            null,
            workspace.id,
            form.id,
          )}
          finishWinnerData={finishWinnerDataAction.bind(
            null,
            workspace.id,
            form.id,
          )}
          exportBaseHref={`/workspaces/${workspace.id}/forms/${form.id}/responses/export`}
          publicFormUrl={publicFormUrl}
          isFixturePreview={isFixturePreview}
          candidates={[...winnerCandidateResponses.map((response, index) => {
            const participantNumber = participantNumbersByToken.get(
              response.token,
            ) ?? String(index + 1);
            const selected = persistedWinnerTokens.has(response.token);
            const profile = candidateProfiles?.get(response.token);
            const label = profile?.label ?? `Participante ${participantNumber}`;

            return {
              token: response.token,
              label,
              detail: `#${participantNumber}`,
              participantNumber,
              email: profile?.email,
              region: profile?.region,
              city: profile?.city,
              selected,
            };
          }), ...missingWinnerTokens.map((token, index) => ({
            token,
            label: "Participante no disponible",
            participantNumber: String(winnerCandidateResponses.length + index + 1),
            selected: true,
            missingResponse: true,
          }))]}
        />
      )}

      {totalParticipants === 0 ? (
        <section
          aria-labelledby="empty-responses-title"
          className="mt-6 rounded-lg border border-[#E5E5E5] bg-white px-5 py-8 sm:px-6"
        >
          <h2
            id="empty-responses-title"
            className="text-base font-semibold text-[#171717]"
          >
            {persistedWinnerTokens.size > 0 ? "No hay respuestas disponibles" : "Aún no hay participantes"}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#595954]">
            {persistedWinnerTokens.size > 0
              ? "No hay respuestas disponibles en este concurso. Los ganadores guardados se conservan hasta que confirmes su retirada."
              : "Este concurso todavía no tiene respuestas registradas. Cuando alguien complete el formulario, sus respuestas aparecerán aquí."}
          </p>
          {!showWinnerPanel && (
            <a
              href={publicFormUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abrir formulario en una nueva pestaña"
              className="mt-4 mr-2 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-[#D1D1CD] bg-white px-3 py-2 text-sm font-medium text-[#595954] transition-colors hover:border-[#FF5C35]/60 hover:text-[#A53318] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35] motion-reduce:transition-none"
            >
              Abrir formulario
              <LuArrowUpRight aria-hidden="true" className="size-3.5 shrink-0" />
            </a>
          )}
          <Link
            href={`/workspaces/${encodeURIComponent(workspace.id)}/forms`}
            className="mt-4 inline-flex min-h-10 items-center rounded-md border border-[#D1D1CD] px-3 py-2 text-sm font-medium text-[#595954] transition-colors hover:border-[#FF5C35] hover:text-[#A53318] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35] motion-reduce:transition-none"
          >
            Volver a formularios
          </Link>
        </section>
      ) : !canSelectWinners ? (
        <p className="mt-6 text-sm leading-6 text-[#595954]">
          Necesitas permisos de edición para consultar los participantes y gestionar los ganadores.
        </p>
      ) : null}
    </>
  );
}
