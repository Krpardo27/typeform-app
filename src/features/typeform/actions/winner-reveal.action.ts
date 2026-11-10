"use server";

import { unstable_rethrow } from "next/navigation";
import { createAuditLog } from "@/features/admin/audit/services/audit-log.service";
import { prisma } from "@/lib/prisma";
import { formBelongsToWorkspace, getTypeformForm, mapMaskedTypeformResponses, resolveWorkspaceTypeformId } from "../services/typeform.service";
import { finishWinnerReveal, getWinnerRevealActor, issueWinnerRevealGrant, requireWinnerRevealGrant, WinnerRevealDenied } from "../services/winner-reveal.service";
import { getWinnerResponsesByToken } from "../services/load-winner-responses";
import type { WinnerConsultationResult, WinnerDetailResult } from "../types/winner-reveal";
import { FIXTURE_READ_ONLY_MESSAGE, usesTypeformResponseFixtures } from "../services/typeform-fixture-mode";

// Autorización viva compartida: no depende de ganadores ni de permisos efímeros.
async function requireParticipantDataAccess(workspaceId: string, formId: string) {
  if (typeof workspaceId !== "string" || !workspaceId.trim() || typeof formId !== "string" || !formId.trim()) throw new WinnerRevealDenied();
  const actor = await getWinnerRevealActor();
  const workspace = await prisma.workspace.findFirst({
    where: { createdFromApp: true, OR: [{ id: workspaceId }, { typeformId: workspaceId }] },
    select: { id: true, typeformId: true, name: true },
  });
  if (!workspace) throw new WinnerRevealDenied();
  if (actor.user.globalRole !== "SUPER_ADMIN") {
    const membership = await prisma.userWorkspace.findUnique({
      where: { userId_workspaceId: { userId: actor.user.id, workspaceId: workspace.id } },
      select: { role: true },
    });
    if (membership?.role !== "EDITOR") throw new WinnerRevealDenied();
  }
  const localForm = await prisma.form.findUnique({
    where: { typeformId: formId }, select: { id: true, workspaceId: true },
  });
  if (localForm && localForm.workspaceId !== workspace.id) throw new WinnerRevealDenied();
  const [remoteForm, remoteWorkspaceId] = await Promise.all([
    getTypeformForm(formId), resolveWorkspaceTypeformId(workspace.typeformId),
  ]);
  if (remoteForm.id !== formId || !formBelongsToWorkspace(remoteForm, remoteWorkspaceId)) throw new WinnerRevealDenied();
  return { actor, workspace, localForm, remoteForm, remoteWorkspaceId };
}

export async function beginSavedWinnerDataAction(workspaceId: string, formId: string): Promise<WinnerConsultationResult> {
  if (usesTypeformResponseFixtures(formId)) return { status: "denied", message: FIXTURE_READ_ONLY_MESSAGE };
  try {
    const { actor, workspace, localForm } = await requireParticipantDataAccess(workspaceId, formId);
    if (!localForm) throw new WinnerRevealDenied();

    const { grant, participants } = await prisma.$transaction(async (tx) => {
      // Mismo bloqueo que la selección: leer tokens y emitir el permiso forman
      // una única instantánea, sin modificar ganadores ni revocar otros flujos.
      await tx.$queryRaw`SELECT "id" FROM "form" WHERE "id" = ${localForm.id} FOR UPDATE`;
      const currentForm = await tx.form.findUnique({ where: { id: localForm.id }, select: {
        typeformId: true, workspaceId: true,
        workspace: { select: { typeformId: true, createdFromApp: true } },
      } });
      if (!currentForm || currentForm.typeformId !== formId || currentForm.workspaceId !== workspace.id ||
        !currentForm.workspace.createdFromApp || currentForm.workspace.typeformId !== workspace.typeformId) throw new WinnerRevealDenied();
      const winners = await tx.formWinner.findMany({
        where: { formId: localForm.id, workspaceId: workspace.id },
        select: { responseToken: true }, orderBy: { responseToken: "asc" },
      });
      if (!winners.length) throw new WinnerRevealDenied();
      const tokens = winners.map((winner) => winner.responseToken);
      const grant = await issueWinnerRevealGrant(tx, actor, workspace.id, formId, localForm.id, tokens);
      return { grant, participants: tokens.map((token, index) => ({ token, label: `Ganador ${index + 1}` })) };
    });
    // La selección, sesión o autorización pudieron cambiar al liberar la fila.
    await requireWinnerRevealGrant(grant.flowToken, workspaceId, formId);
    return { status: "ready", grant, participants };
  } catch (error) {
    unstable_rethrow(error);
    return { status: "denied", message: error instanceof WinnerRevealDenied ? error.message : "No se pudo iniciar la consulta. Vuelve a consultar los ganadores guardados." };
  }
}

export async function readWinnerDataAction(workspaceId: string, formId: string, flowToken: string, responseToken: string): Promise<WinnerDetailResult> {
  if (usesTypeformResponseFixtures(formId)) return { status: "denied", message: FIXTURE_READ_ONLY_MESSAGE };
  try {
    const context = await requireWinnerRevealGrant(flowToken, workspaceId, formId);
    if (!context.grant.responseTokens.includes(responseToken)) throw new WinnerRevealDenied();
    const form = await getTypeformForm(formId);
    if (form.id !== formId || !formBelongsToWorkspace(form, context.form.workspace.typeformId)) throw new WinnerRevealDenied();
    const raw = (await getWinnerResponsesByToken(formId, [responseToken])).get(responseToken);
    if (!raw || raw.token !== responseToken) throw new WinnerRevealDenied();
    // Cierre, caducidad, cambio de selección o revocación mientras esperaba Typeform.
    const current = await requireWinnerRevealGrant(flowToken, workspaceId, formId);
    const winner = current.winners.find((winner) => winner.responseToken === responseToken);
    if (!winner || !current.grant.responseTokens.includes(responseToken)) throw new WinnerRevealDenied();
    const response = mapMaskedTypeformResponses(form, [raw], { unmaskTokens: new Set([responseToken]) })[0];
    await createAuditLog({ action: "SENSITIVE_DATA_VIEWED", required: true, actor: current.actor.user,
      target: { type: "form_winner_data", id: formId }, context: {
        workspaceId: current.form.workspaceId, workspaceName: current.form.workspace.name, formId, formTitle: form.title,
        metadata: { displayedResponses: 1, revealedTokens: responseToken, scope: "winner_modal", reason: winner.reason },
      } });
    await requireWinnerRevealGrant(flowToken, workspaceId, formId);
    return { status: "revealed", expiresAt: current.expiresAt.toISOString(), response,
      contact: winner.participantEmail ?? undefined };
  } catch (error) {
    unstable_rethrow(error);
    return { status: "denied", message: error instanceof WinnerRevealDenied ? error.message : "No se pudieron consultar los datos. Cierra el detalle y vuelve a consultar los ganadores guardados." };
  }
}

export async function finishWinnerDataAction(workspaceId: string, formId: string, flowToken: string) {
  await finishWinnerReveal(flowToken, workspaceId, formId);
}

export async function readParticipantDataAction(workspaceId: string, formId: string, flowToken: string, responseToken: string): Promise<WinnerDetailResult> {
  // Compatibilidad de firma, no de privilegios: nunca consultar candidatos
  // sin grant real, selección persistida y auditoría del flujo de ganadores.
  return readWinnerDataAction(workspaceId, formId, flowToken, responseToken);
}