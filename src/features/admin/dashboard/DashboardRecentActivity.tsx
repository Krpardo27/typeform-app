import { type AuditTimelineEvent } from "@/features/admin/audit/services/audit-timeline.service";

type Props = {
  timeline: AuditTimelineEvent[];
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function getEventBadgeClass(action: string, metadata: unknown) {
  if (metadata && typeof metadata === "object") {
    const eventType = (metadata as Record<string, unknown>).eventType;
    if (eventType === "MEMBER_AUTHORIZED")
      return "bg-[#16A34A]/10 text-[#16A34A]";
    if (eventType === "MEMBER_REVOKED")
      return "bg-[#DC2626]/10 text-[#DC2626]";
    if (eventType === "OTP_RATE_LIMITED")
      return "bg-[#CA8A04]/10 text-[#CA8A04]";
  }
  const map: Record<string, string> = {
    WINNER_SELECTED:     "bg-[#16A34A]/10 text-[#16A34A]",
    SENSITIVE_DATA_VIEWED: "bg-[#DC2626]/10 text-[#DC2626]",
    FORM_CLONED:         "bg-sky-100 text-sky-700",
    OTP_REQUESTED:       "bg-violet-100 text-violet-700",
    LOGIN_SESSION_CREATED: "bg-sky-100 text-sky-700",
  };
  return map[action] ?? "bg-[#F5F5F5] text-[#737373]";
}

export function DashboardRecentActivity({ timeline }: Props) {
  return (
    <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF]">
      <div className="flex items-center justify-between border-b border-[#E5E5E5] px-6 py-4">
        <h2 className="text-base font-semibold text-[#171717]">
          Actividad Reciente
        </h2>
        <span className="text-xs text-[#737373]">Últimos eventos</span>
      </div>
      {timeline.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-[#737373]">
          Todavía no hay eventos registrados.
        </p>
      ) : (
          <div className="divide-y divide-[#E5E5E5]">
          {timeline.map((event) => (
            <div
              key={`${event.source}-${event.id}`}
              className="flex flex-col gap-1 px-5 py-3 transition hover:bg-[#F5F5F5] sm:flex-row sm:items-center sm:gap-4"
            >
              <span
                className={`shrink-0 self-start rounded px-2 py-0.5 text-xs font-medium sm:self-auto ${getEventBadgeClass(event.action, event.metadata)}`}
              >
                {event.title}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-[#171717]">{event.detail}</p>
                <p className="truncate text-xs text-[#737373]">{event.actor}</p>
              </div>
              <span className="shrink-0 text-xs text-[#737373]">
                {formatDate(event.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
