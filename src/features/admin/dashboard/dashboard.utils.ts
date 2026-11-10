import {
  getAuditMetadataEventType,
  type AuditTimelineEvent,
} from "@/features/admin/audit/services/audit-timeline.service";

export const DASHBOARD_ACTIVITY_LIMIT = 5;
export const DASHBOARD_TIME_ZONE = "UTC";

export function getDashboardPeriods(now: Date) {
  return {
    startOfMonth: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    sevenDaysAgo: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
  };
}

export function formatDashboardDate(value: Date, includeSeconds = false) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: includeSeconds ? "medium" : "short",
    timeZone: DASHBOARD_TIME_ZONE,
  }).format(value);
}

export function getActivityContext(event: Pick<AuditTimelineEvent, "actor" | "detail">) {
  const actor = event.actor.trim();
  const detail = event.detail.trim();
  return detail && detail.toLocaleLowerCase("es") !== actor.toLocaleLowerCase("es")
    ? `${actor} · ${detail}`
    : actor;
}

export function getActivityTone(event: Pick<AuditTimelineEvent, "action" | "metadata">) {
  const eventType = getAuditMetadataEventType(event.metadata);
  if (eventType === "MEMBER_REVOKED") return "critical";
  if (eventType === "OTP_RATE_LIMITED" || event.action === "SENSITIVE_DATA_VIEWED") {
    return "attention";
  }
  return "neutral";
}