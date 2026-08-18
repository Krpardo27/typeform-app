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
      return "bg-emerald-950 text-emerald-400";
    if (eventType === "MEMBER_REVOKED")
      return "bg-red-950 text-red-400";
    if (eventType === "OTP_RATE_LIMITED")
      return "bg-amber-950 text-amber-400";
  }
  const map: Record<string, string> = {
    WINNER_SELECTED:     "bg-emerald-950 text-emerald-400",
    SENSITIVE_DATA_VIEWED: "bg-rose-950 text-rose-400",
    FORM_CLONED:         "bg-sky-950 text-sky-400",
    OTP_REQUESTED:       "bg-violet-950 text-violet-400",
    LOGIN_SESSION_CREATED: "bg-sky-950 text-sky-400",
  };
  return map[action] ?? "bg-zinc-800 text-zinc-400";
}

export function DashboardRecentActivity({ timeline }: Props) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0f0f0f]">
      <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <h2 className="text-base font-semibold text-zinc-100">
          Actividad Reciente
        </h2>
        <span className="text-xs text-zinc-500">Últimos eventos</span>
      </div>
      {timeline.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-zinc-500">
          Todavía no hay eventos registrados.
        </p>
      ) : (
        <div className="divide-y divide-zinc-800/70">
          {timeline.map((event) => (
            <div
              key={`${event.source}-${event.id}`}
              className="flex flex-col gap-1 px-5 py-3 transition hover:bg-zinc-900/40 sm:flex-row sm:items-center sm:gap-4"
            >
              <span
                className={`shrink-0 self-start rounded px-2 py-0.5 text-xs font-medium sm:self-auto ${getEventBadgeClass(event.action, event.metadata)}`}
              >
                {event.title}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-zinc-300">{event.detail}</p>
                <p className="truncate text-xs text-zinc-500">{event.actor}</p>
              </div>
              <span className="shrink-0 text-xs text-zinc-600">
                {formatDate(event.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
