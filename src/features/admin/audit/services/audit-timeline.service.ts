type AuditLogItem = {
  id: string;
  action: string;
  actorName: string | null;
  actorEmail: string | null;
  formTitle: string | null;
  workspaceName: string | null;
  targetId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown;
  createdAt: Date;
};

type SessionItem = {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  user: {
    name: string | null;
    email: string;
  };
};

export type AuditTimelineEvent = {
  id: string;
  action: string;
  title: string;
  actor: string;
  detail: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  metadata: unknown;
  source: "audit" | "session";
};

function getMetadataEventType(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const eventType = (metadata as Record<string, unknown>).eventType;

  if (typeof eventType !== "string") {
    return null;
  }

  return eventType;
}

function formatAction(action: string, metadata?: unknown) {
  const eventType = getMetadataEventType(metadata);

  if (eventType === "MEMBER_AUTHORIZED") {
    return "Miembro autorizado";
  }

  if (eventType === "MEMBER_REVOKED") {
    return "Miembro revocado";
  }

  const labels: Record<string, string> = {
    OTP_REQUESTED: "Código solicitado",
    FORM_CLONED: "Formulario clonado",
    SENSITIVE_DATA_VIEWED: "Datos sensibles vistos",
    WINNER_SELECTED: "Ganadores seleccionados",
  };

  return labels[action] ?? action;
}

export function buildAuditTimeline(
  auditLogs: AuditLogItem[],
  sessions: SessionItem[],
) {
  return [
    ...auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      title: formatAction(log.action, log.metadata),
      actor: log.actorName ?? log.actorEmail ?? "Sistema",
      detail:
        log.formTitle ??
        log.workspaceName ??
        log.targetId ??
        "Evento administrativo",
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
      metadata: log.metadata,
      source: "audit" as const,
    })),
    ...sessions.map((session) => ({
      id: session.id,
      action: "LOGIN_SESSION_CREATED",
      title: "Inicio de sesión",
      actor: session.user.name ?? session.user.email,
      detail: session.user.email,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      metadata: null,
      source: "session" as const,
    })),
  ].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
}

export function getAuditMetadataEventType(metadata: unknown) {
  return getMetadataEventType(metadata);
}