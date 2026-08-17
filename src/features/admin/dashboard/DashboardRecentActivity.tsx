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
      return "border-emerald-400/40 bg-emerald-400/10 text-emerald-300";
    if (eventType === "MEMBER_REVOKED")
      return "border-red-400/40 bg-red-400/10 text-red-300";
    if (eventType === "OTP_RATE_LIMITED")
      return "border-amber-400/40 bg-amber-400/10 text-amber-300";
  }
  const map: Record<string, string> = {
    WINNER_SELECTED: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
    SENSITIVE_DATA_VIEWED: "border-rose-400/40 bg-rose-400/10 text-rose-300",
    FORM_CLONED: "border-sky-400/40 bg-sky-400/10 text-sky-300",
    OTP_REQUESTED: "border-violet-400/40 bg-violet-400/10 text-violet-300",
    LOGIN_SESSION_CREATED: "border-sky-400/40 bg-sky-400/10 text-sky-300",
  };
  return map[action] ?? "border-zinc-700 bg-zinc-900 text-zinc-300";
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
        <>
          {/* Mobile: Cards */}
          <div className="grid gap-3 p-4 sm:p-5 grid-cols-1 sm:grid-cols-2 lg:hidden auto-rows-max">
            {timeline.map((event) => (
              <div
                key={`${event.source}-${event.id}`}
                className="flex flex-col gap-2 rounded-lg border border-zinc-700/50 bg-zinc-900/30 p-3 transition hover:bg-zinc-900/60 hover:border-zinc-700"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${getEventBadgeClass(event.action, event.metadata)}`}
                  >
                    {event.title}
                  </span>
                  <span className="text-xs text-zinc-600">
                    {formatDate(event.createdAt)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm text-zinc-300">{event.detail}</p>
                  <p className="mt-1 truncate text-xs text-zinc-500">{event.actor}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: List */}
          <div className="hidden lg:block divide-y divide-zinc-800/70">
            {timeline.map((event) => (
              <div
                key={`${event.source}-${event.id}`}
                className="flex items-center gap-4 px-6 py-3.5 hover:bg-zinc-900/40 transition"
              >
                <span
                  className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium ${getEventBadgeClass(event.action, event.metadata)}`}
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
        </>
      )}
    </div>
  );
}
