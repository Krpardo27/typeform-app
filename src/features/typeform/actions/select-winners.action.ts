"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { getWorkspaceAccessContext } from "@/features/admin/workspaces/services/workspace-access";
import { createAuditLog } from "@/features/admin/audit/services/audit-log.service";
import {
  formBelongsToWorkspace,
  getTypeformForm,
  getTypeformResponseParticipantEmail,
  resolveWorkspaceTypeformId,
  TypeformResponseItem,
} from "@/features/typeform/services/typeform.service";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getWinnerResponsesByToken } from "../services/load-winner-responses";
import { getWinnerRevealActor, issueWinnerRevealGrant, revokeWinnerRevealGrants, WinnerRevealDenied } from "../services/winner-reveal.service";
import type { WinnerRevealActor } from "../services/winner-reveal.service";
import type { WinnerRevealGrant, WinnerSelectionResult } from "../types/winner-reveal";
import { FIXTURE_READ_ONLY_MESSAGE, usesTypeformResponseFixtures } from "../services/typeform-fixture-mode";

const WINNER_COOKIE_PREFIX = "winner_selection";

async function requireSelectionAccess(
  db: Prisma.TransactionClient,
  actor: WinnerRevealActor,
  workspace: { id: string; typeformId: string },
) {
  const currentWorkspace = await db.workspace.findUnique({
    where: { id: workspace.id },
    select: { typeformId: true, createdFromApp: true },
  });
  if (!currentWorkspace?.createdFromApp || currentWorkspace.typeformId !== workspace.typeformId) {
    throw new WinnerRevealDenied();
  }
  if (actor.user.globalRole !== "SUPER_ADMIN") {
    const membership = await db.userWorkspace.findUnique({
      where: { userId_workspaceId: { userId: actor.user.id, workspaceId: workspace.id } },
      select: { role: true },
    });
    // La ausencia de membresía nunca hereda el rol del contexto cacheado.
    if (membership?.role !== "EDITOR") throw new WinnerRevealDenied();
  }
}

async function lockSelectionActor(
  tx: Prisma.TransactionClient,
  actor: WinnerRevealActor,
  workspaceId: string,
): Promise<WinnerRevealActor> {
  // FOR SHARE (no KEY SHARE) también bloquea cambios de status/role/expiresAt.
  // ReadCommitted ve las revocaciones confirmadas mientras esperaba cada lock;
  // las filas permanecen protegidas hasta commit, sin cooperación del revocador.
  await tx.$queryRaw`SELECT "id" FROM "user" WHERE "id" = ${actor.user.id} FOR SHARE`;
  await tx.$queryRaw`SELECT "id" FROM "session" WHERE "id" = ${actor.session.id} FOR SHARE`;
  await tx.$queryRaw`SELECT "id" FROM "workspace" WHERE "id" = ${workspaceId} FOR SHARE`;
  await tx.$queryRaw`SELECT "id" FROM "user_workspace" WHERE "userId" = ${actor.user.id} AND "workspaceId" = ${workspaceId} FOR SHARE`;

  const user = await tx.user.findUnique({
    where: { id: actor.user.id },
    select: { id: true, email: true, name: true, globalRole: true, status: true },
  });
  const session = await tx.session.findUnique({
    where: { id: actor.session.id },
    select: { id: true, userId: true, expiresAt: true },
  });
  if (!user || !session || session.userId !== user.id || user.status !== "ACTIVE") {
    throw new WinnerRevealDenied();
  }
  if (user.globalRole !== "SUPER_ADMIN") {
    await tx.$queryRaw`SELECT "id" FROM "alloweduser" WHERE LOWER("email") = LOWER(${user.email}) FOR SHARE`;
    const allowed = await tx.allowedUser.findFirst({
      where: { email: { equals: user.email, mode: "insensitive" } }, select: { id: true },
    });
    if (!allowed) throw new WinnerRevealDenied();
  }
  return { user, session };
}

async function persistWinnerSelection(
  workspaceId: string,
  formId: string,
  formData: FormData,
  withReveal: boolean,
) {
  if (usesTypeformResponseFixtures(formId)) {
    if (withReveal) return { status: "denied", message: FIXTURE_READ_ONLY_MESSAGE } satisfies WinnerSelectionResult;
    redirect(`/workspaces/${encodeURIComponent(workspaceId)}/forms/${encodeURIComponent(formId)}/responses?winnerError=fixture`);
  }
  const { user, workspace } = await getWorkspaceAccessContext(workspaceId);
  const responsesPath = `/workspaces/${workspaceId}/forms/${formId}/responses`;
  const initialActor = await getWinnerRevealActor();
  if (initialActor.user.id !== user.id) throw new WinnerRevealDenied();
  await requireSelectionAccess(prisma, initialActor, workspace);
  const revalidateActor = async () => {
    const actor = await getWinnerRevealActor();
    if (actor.user.id !== user.id || actor.session.id !== initialActor.session.id) throw new WinnerRevealDenied();
    await requireSelectionAccess(prisma, actor, workspace);
    return actor;
  };

  const winnerTokens = [
    ...new Set(
      formData
        .getAll("winnerToken")
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];

  const page =
    typeof formData.get("page") === "string" ? String(formData.get("page")) : "1";
  const pageSize =
    typeof formData.get("pageSize") === "string"
      ? String(formData.get("pageSize"))
      : "20";
  const winnerRegionFilter =
    typeof formData.get("winnerRegionFilter") === "string"
      ? String(formData.get("winnerRegionFilter")).trim()
      : "";

  const reasonValue = formData.get("reason");
  const reason = typeof reasonValue === "string" ? reasonValue.trim() : "";

  if (!reason) {
    redirect(`${responsesPath}?winnerError=reason`);
  }

  const localForm = await prisma.form.findUnique({
    where: { typeformId: formId },
    select: { id: true, workspaceId: true },
  });

  if (localForm && localForm.workspaceId !== workspace.id) {
    redirect(`${responsesPath}?winnerError=forbidden`);
  }

  const [typeformForm, resolvedWorkspaceTypeformId] = await Promise.all([
    getTypeformForm(formId),
    resolveWorkspaceTypeformId(workspace.typeformId),
  ]);
  await revalidateActor();

  if (
    typeformForm.id !== formId ||
    !formBelongsToWorkspace(typeformForm, resolvedWorkspaceTypeformId)
  ) {
    redirect(`${responsesPath}?winnerError=forbidden`);
  }

  const winnerResponses =
    winnerTokens.length > 0
      ? await getWinnerResponsesByToken(formId, winnerTokens)
      : new Map<string, TypeformResponseItem>();
  const revealActor = await revalidateActor();

  if (winnerTokens.some((token) => !winnerResponses.has(token))) {
    redirect(`${responsesPath}?winnerError=invalid-response`);
  }

  const winnerContacts = winnerTokens.map((token) => ({
    token,
    participantEmail: getTypeformResponseParticipantEmail(
      winnerResponses.get(token)!,
    ),
  }));

  let grant: WinnerRevealGrant | null = null;
  await prisma.$transaction(async (tx) => {
    // Include workspaceId in the unique selector: never reassign a form that
    // was created/moved to another workspace while Typeform was being read.
    const savedForm = await tx.form.upsert({
      where: { typeformId: formId, workspaceId: workspace.id },
      create: {
        title: typeformForm.title ?? formId,
        description: null,
        typeformId: formId,
        selfUrl: typeformForm.self?.href ?? null,
        workspaceId: workspace.id,
      },
      update: {},
      select: { id: true },
    });
    // Bloqueo por formulario y revocación atómica de cualquier consulta anterior.
    await revokeWinnerRevealGrants(tx, workspace.id, formId, savedForm.id);
    // Primero el lock del formulario: si esperó a otra selección, comprobar
    // permisos DESPUÉS de esa espera. Cualquier denegación revierte también
    // el upsert y la revocación de grants de esta transacción.
    const currentActor = await lockSelectionActor(tx, revealActor, workspace.id);
    await requireSelectionAccess(tx, currentActor, workspace);
    const currentForm = await tx.form.findUnique({
      where: { id: savedForm.id }, select: { typeformId: true, workspaceId: true },
    });
    if (!currentForm || currentForm.workspaceId !== workspace.id || currentForm.typeformId !== formId ||
      currentActor.session.expiresAt.getTime() <= Date.now()) throw new WinnerRevealDenied();

    await tx.formWinner.deleteMany({
      where: {
        formId: savedForm.id,
        workspaceId: workspace.id,
        ...(winnerTokens.length > 0
          ? { responseToken: { notIn: winnerTokens } }
          : {}),
      },
    });

    for (const { token, participantEmail } of winnerContacts) {
      await tx.formWinner.upsert({
        where: {
          formId_responseToken: {
            formId: savedForm.id,
            responseToken: token,
          },
          workspaceId: workspace.id,
        },
        update: {
          participantEmail,
          reason,
          selectedByUserId: user.id,
          selectedAt: new Date(),
        },
        create: {
          formId: savedForm.id,
          workspaceId: workspace.id,
          responseToken: token,
          participantEmail,
          reason,
          selectedByUserId: user.id,
          selectedAt: new Date(),
        },
      });
    }
    if (withReveal && winnerTokens.length > 0) {
      grant = await issueWinnerRevealGrant(tx, currentActor, workspace.id, formId, savedForm.id, winnerTokens);
    }
    // Los locks no detienen el reloj: tampoco confirmar una sesión que expiró
    // durante las escrituras o la emisión del permiso.
    if (currentActor.session.expiresAt.getTime() <= Date.now()) throw new WinnerRevealDenied();
  }, { isolationLevel: "ReadCommitted" });

  if (!withReveal) {
  const cookieStore = await cookies();
  const cookieName = `${WINNER_COOKIE_PREFIX}:${workspaceId}:${formId}`;
  const cookiePath = `/workspaces/${workspaceId}/forms/${formId}/responses`;

  if (winnerTokens.length === 0) {
    cookieStore.set(cookieName, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: cookiePath,
      maxAge: 0,
    });
  } else {
    cookieStore.set(
      cookieName,
      JSON.stringify({
        tokens: winnerTokens,
        reason,
        at: new Date().toISOString(),
        by: user.id,
      }),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: cookiePath,
        maxAge: 120,
      },
    );
  }
  }

  await createAuditLog({
    action: "WINNER_SELECTED",
    actor: user,
    target: { type: "form_winners", id: formId },
    context: {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      formId,
      metadata: {
        winnerCount: winnerTokens.length,
        winnerTokens: winnerTokens.join(","),
        reason,
      },
    },
  });

  revalidatePath(responsesPath);
  if (withReveal) return { status: "confirmed", winnerCount: winnerTokens.length, grant } satisfies WinnerSelectionResult;

  const redirectParams = new URLSearchParams({
    page,
    pageSize,
    winnerSelection: "1",
  });

  if (winnerRegionFilter) {
    redirectParams.set("winnerRegionFilter", winnerRegionFilter);
  }

  redirect(
    `/workspaces/${workspaceId}/forms/${formId}/responses?${redirectParams}`,
  );
}

// Compatibilidad del flujo anterior: persiste, pero nunca concede datos.
export async function selectWinnersAction(workspaceId: string, formId: string, formData: FormData) {
  try {
    return await persistWinnerSelection(workspaceId, formId, formData, false);
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof WinnerRevealDenied) {
      redirect(`/workspaces/${workspaceId}/forms/${formId}/responses?winnerError=forbidden`);
    }
    throw error;
  }
}

export async function confirmWinnersForRevealAction(workspaceId: string, formId: string, formData: FormData): Promise<WinnerSelectionResult> {
  try {
    return await persistWinnerSelection(workspaceId, formId, formData, true);
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof WinnerRevealDenied) return { status: "denied", message: error.message };
    throw error;
  }
}
