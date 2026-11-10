import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { WinnerRevealGrant } from "../types/winner-reveal";

export const WINNER_REVEAL_TTL_MS = 120_000;
const PREFIX = "winner-reveal:v1:";
const grantSchema = z.object({
  purpose: z.literal("winner-reveal"), version: z.literal(1),
  userId: z.string().min(1), sessionId: z.string().min(1),
  workspaceId: z.string().min(1), formId: z.string().min(1), typeformFormId: z.string().min(1),
  responseTokens: z.array(z.string().min(1)).min(1), revision: z.string().min(1),
}).strict();

export class WinnerRevealDenied extends Error {
  constructor() { super("Vuelve a consultar los ganadores guardados para acceder a sus datos."); }
}
function hash(value: string) { return createHash("sha256").update(value).digest("hex"); }
function recordId(flowToken: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(flowToken)) throw new WinnerRevealDenied();
  return `${PREFIX}${hash(flowToken)}`;
}
function scopeId(workspaceId: string, formId: string) { return `${PREFIX}${workspaceId}:${formId}`; }
function revision(rows: { responseToken: string; selectedAt: Date }[]) {
  return hash(JSON.stringify(rows.map((row) => [row.responseToken, row.selectedAt.toISOString()]).sort((a, b) => a[0].localeCompare(b[0]))));
}

export async function getWinnerRevealActor() {
  const current = await auth.api.getSession({ headers: await headers(), query: { disableCookieCache: true } });
  if (!current) throw new WinnerRevealDenied();
  const [session, user] = await Promise.all([
    prisma.session.findUnique({ where: { id: current.session.id }, select: { id: true, userId: true, expiresAt: true } }),
    prisma.user.findUnique({ where: { id: current.user.id }, select: { id: true, email: true, name: true, globalRole: true, status: true } }),
  ]);
  if (!session || !user || session.userId !== user.id || session.expiresAt.getTime() <= Date.now() || user.status !== "ACTIVE") throw new WinnerRevealDenied();
  if (user.globalRole !== "SUPER_ADMIN") {
    const allowed = await prisma.allowedUser.findFirst({ where: { email: { equals: user.email, mode: "insensitive" } }, select: { id: true } });
    if (!allowed) throw new WinnerRevealDenied();
  }
  return { user, session };
}
export type WinnerRevealActor = Awaited<ReturnType<typeof getWinnerRevealActor>>;

// Verification ya almacena comprobaciones efímeras. Namespace exclusivo;
// nunca se usa el adaptador de OTP ni se guardan datos completos aquí.
export async function revokeWinnerRevealGrants(tx: Prisma.TransactionClient, workspaceId: string, formId: string, localFormId: string) {
  await tx.$queryRaw`SELECT "id" FROM "form" WHERE "id" = ${localFormId} FOR UPDATE`;
  await tx.verification.deleteMany({ where: { identifier: scopeId(workspaceId, formId) } });
}

export async function issueWinnerRevealGrant(tx: Prisma.TransactionClient, actor: WinnerRevealActor, workspaceId: string, formId: string, localFormId: string, tokens: string[]): Promise<WinnerRevealGrant> {
  const expiresAt = new Date(Math.min(Date.now() + WINNER_REVEAL_TTL_MS, actor.session.expiresAt.getTime()));
  if (expiresAt.getTime() <= Date.now()) throw new WinnerRevealDenied();
  const winners = await tx.formWinner.findMany({ where: { formId: localFormId, workspaceId }, select: { responseToken: true, selectedAt: true } });
  if (winners.length !== tokens.length || winners.some((winner) => !tokens.includes(winner.responseToken))) throw new WinnerRevealDenied();
  const flowToken = randomBytes(32).toString("base64url");
  await tx.verification.create({ data: {
    id: recordId(flowToken), identifier: scopeId(workspaceId, formId), expiresAt,
    value: JSON.stringify({ purpose: "winner-reveal", version: 1, userId: actor.user.id, sessionId: actor.session.id,
      workspaceId, formId: localFormId, typeformFormId: formId, responseTokens: tokens, revision: revision(winners) }),
  } });
  return { flowToken, expiresAt: expiresAt.toISOString() };
}

export async function requireWinnerRevealGrant(flowToken: string, workspaceLookup: string, typeformFormId: string) {
  const id = recordId(flowToken);
  const actor = await getWinnerRevealActor();
  const record = await prisma.verification.findUnique({ where: { id } });
  if (!record || record.expiresAt.getTime() <= Date.now()) throw new WinnerRevealDenied();
  let value: unknown;
  try { value = JSON.parse(record.value); } catch { throw new WinnerRevealDenied(); }
  const parsed = grantSchema.safeParse(value);
  if (!parsed.success) throw new WinnerRevealDenied();
  const grant = parsed.data;
  if (record.identifier !== scopeId(grant.workspaceId, grant.typeformFormId) || grant.userId !== actor.user.id || grant.sessionId !== actor.session.id || grant.typeformFormId !== typeformFormId) throw new WinnerRevealDenied();
  const form = await prisma.form.findUnique({ where: { id: grant.formId }, select: {
    id: true, typeformId: true, workspaceId: true,
    workspace: { select: { id: true, typeformId: true, name: true, createdFromApp: true } },
  } });
  if (!form || form.typeformId !== typeformFormId || form.workspaceId !== grant.workspaceId || !form.workspace.createdFromApp || ![form.workspaceId, form.workspace.typeformId].includes(workspaceLookup)) throw new WinnerRevealDenied();
  if (actor.user.globalRole !== "SUPER_ADMIN") {
    const membership = await prisma.userWorkspace.findUnique({ where: { userId_workspaceId: { userId: actor.user.id, workspaceId: grant.workspaceId } }, select: { role: true } });
    if (membership?.role !== "EDITOR") throw new WinnerRevealDenied();
  }
  const winners = await prisma.formWinner.findMany({ where: { formId: grant.formId, workspaceId: grant.workspaceId }, select: { responseToken: true, participantEmail: true, selectedAt: true, reason: true } });
  if (winners.length !== grant.responseTokens.length || new Set(grant.responseTokens).size !== grant.responseTokens.length || winners.some((winner) => !grant.responseTokens.includes(winner.responseToken)) || revision(winners) !== grant.revision) throw new WinnerRevealDenied();
  return { actor, form, grant, winners, expiresAt: record.expiresAt, recordId: id };
}

export async function finishWinnerReveal(flowToken: string, workspaceId: string, formId: string) {
  // Revocar solo exige ser dueño de la sesión, incluso si ya perdió permisos
  // o el plazo terminó. No conservar permisos que puedan resucitar después.
  try {
    const id = recordId(flowToken);
    const session = await auth.api.getSession({ headers: await headers(), query: { disableCookieCache: true } });
    if (!session) return;
    const record = await prisma.verification.findUnique({ where: { id } });
    if (!record) return;
    const parsed = grantSchema.safeParse(JSON.parse(record.value));
    if (!parsed.success || parsed.data.userId !== session.user.id || parsed.data.sessionId !== session.session.id || parsed.data.workspaceId !== workspaceId || parsed.data.typeformFormId !== formId || record.identifier !== scopeId(workspaceId, formId)) return;
    await prisma.verification.deleteMany({ where: { id, identifier: record.identifier } });
  } catch (error) {
    if (error instanceof SyntaxError) return;
    if (!(error instanceof WinnerRevealDenied)) throw error;
  }
}