import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { AuditAction } from "@/generated/prisma/enums";

type AuditActor = {
  id?: string | null;
  email?: string | null;
  name?: string | null;
};

type AuditTarget = {
  type?: string;
  id?: string;
};

type AuditContext = {
  workspaceId?: string;
  workspaceName?: string;
  formId?: string;
  formTitle?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export async function getRequestAuditContext() {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();

  return {
    ipAddress:
      forwardedFor ??
      requestHeaders.get("x-real-ip") ??
      requestHeaders.get("cf-connecting-ip"),
    userAgent: requestHeaders.get("user-agent"),
  };
}

export async function createAuditLog({
  action,
  actor,
  target,
  context,
}: {
  action: AuditAction;
  actor?: AuditActor;
  target?: AuditTarget;
  context?: AuditContext;
}) {
  const requestContext = await getRequestAuditContext().catch(() => ({
    ipAddress: null,
    userAgent: null,
  }));

  try {
    await prisma.auditLog.create({
      data: {
        action,
        actorId: actor?.id ?? null,
        actorEmail: actor?.email ?? null,
        actorName: actor?.name ?? null,
        targetType: target?.type ?? null,
        targetId: target?.id ?? null,
        workspaceId: context?.workspaceId ?? null,
        workspaceName: context?.workspaceName ?? null,
        formId: context?.formId ?? null,
        formTitle: context?.formTitle ?? null,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        metadata: context?.metadata ?? undefined,
      },
    });
  } catch (error) {
    console.error("[AUDIT] Failed to create audit log", error);
  }
}