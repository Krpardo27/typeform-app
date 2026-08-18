import {
  LuClock3,
  LuFilePlus2,
  LuKeyRound,
  LuLogIn,
  LuShieldCheck,
  LuTrophy,
  LuUserMinus,
  LuUserPlus,
} from "react-icons/lu";
import {
  getAuditMetadataEventType,
  type AuditTimelineEvent,
} from "../services/audit-timeline.service";

type Props = {
  timeline: AuditTimelineEvent[];
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function getActionIcon(action: string, metadata?: unknown) {
  const eventType = getAuditMetadataEventType(metadata);

  if (eventType === "MEMBER_AUTHORIZED") return LuUserPlus;
  if (eventType === "MEMBER_REVOKED") return LuUserMinus;
  if (eventType === "OTP_RATE_LIMITED") return LuShieldCheck;

  if (action === "OTP_REQUESTED") return LuKeyRound;
  if (action === "FORM_CLONED") return LuFilePlus2;
  if (action === "SENSITIVE_DATA_VIEWED") return LuShieldCheck;
  if (action === "WINNER_SELECTED") return LuTrophy;
  return LuClock3;
}

function getActionStyle(action: string, metadata?: unknown) {
  const eventType = getAuditMetadataEventType(metadata);

  if (eventType === "MEMBER_AUTHORIZED") {
    return {
      badge: "bg-emerald-950 text-emerald-400",
      icon: "text-emerald-400",
    };
  }

  if (eventType === "MEMBER_REVOKED") {
    return {
      badge: "bg-red-950 text-red-400",
      icon: "text-red-400",
    };
  }

  if (eventType === "OTP_RATE_LIMITED") {
    return {
      badge: "bg-amber-950 text-amber-400",
      icon: "text-amber-400",
    };
  }

  if (action === "WINNER_SELECTED") {
    return {
      badge: "bg-emerald-950 text-emerald-400",
      icon: "text-emerald-400",
    };
  }

  if (action === "SENSITIVE_DATA_VIEWED") {
    return {
      badge: "bg-rose-950 text-rose-400",
      icon: "text-rose-400",
    };
  }

  if (action === "FORM_CLONED") {
    return {
      badge: "bg-sky-950 text-sky-400",
      icon: "text-sky-400",
    };
  }

  if (action === "OTP_REQUESTED") {
    return {
      badge: "bg-violet-950 text-violet-400",
      icon: "text-violet-400",
    };
  }

  if (action === "LOGIN_SESSION_CREATED") {
    return {
      badge: "bg-sky-950 text-sky-400",
      icon: "text-sky-400",
    };
  }

  return {
    badge: "bg-zinc-800 text-zinc-400",
    icon: "text-zinc-400",
  };
}

function getWinnerCount(event: AuditTimelineEvent) {
  if (
    event.action !== "WINNER_SELECTED" ||
    !event.metadata ||
    typeof event.metadata !== "object" ||
    !("winnerCount" in event.metadata)
  ) {
    return null;
  }

  return String((event.metadata as Record<string, unknown>).winnerCount ?? "");
}

export function AuditTimeline({ timeline }: Props) {
  return (
    <section className="mt-8 rounded-xl border border-zinc-800 bg-[#111113]">
      {timeline.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-zinc-500">
          Todavía no hay eventos de auditoría.
        </div>
      ) : (
        <>
          {/* Mobile: Cards */}
          <div className="divide-y divide-zinc-800 lg:hidden">
            {timeline.map((event) => {
              const Icon =
                event.action === "LOGIN_SESSION_CREATED"
                  ? LuLogIn
                  : getActionIcon(event.action, event.metadata);
              const style = getActionStyle(event.action, event.metadata);
              const winnerCount = getWinnerCount(event);

              return (
                <div
                  key={`${event.source}-${event.id}`}
                  className="flex flex-col gap-3 px-5 py-4"
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`size-4 shrink-0 ${style.icon}`} />
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${style.badge}`}
                    >
                      {event.title}
                    </span>
                    <span className="ml-auto text-xs text-zinc-500 whitespace-nowrap">
                      {formatDate(event.createdAt)}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{event.actor}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-zinc-400">{event.detail}</p>
                    {winnerCount && (
                      <p className="mt-1 text-xs text-emerald-400">
                        {winnerCount} ganador(es) seleccionados
                      </p>
                    )}
                    {event.userAgent && (
                      <p className="mt-1 line-clamp-1 text-xs text-zinc-600">{event.userAgent}</p>
                    )}
                  </div>

                  {event.ipAddress && (
                    <p className="text-xs text-zinc-600">{event.ipAddress}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop: Table */}
          <div className="hidden lg:block overflow-x-auto">
            <div className="min-w-230">
              <div className="grid grid-cols-[160px_1.1fr_1fr_160px_220px] gap-4 border-b border-zinc-800 px-5 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                <span>Evento</span>
                <span>Actor</span>
                <span>Detalle</span>
                <span>IP</span>
                <span>Fecha</span>
              </div>

              <div className="max-h-[70vh] divide-y divide-zinc-800 overflow-y-auto">
                {timeline.map((event) => {
                  const Icon =
                    event.action === "LOGIN_SESSION_CREATED"
                      ? LuLogIn
                      : getActionIcon(event.action, event.metadata);
                  const style = getActionStyle(event.action, event.metadata);
                  const winnerCount = getWinnerCount(event);

                  return (
                    <div
                      key={`${event.source}-${event.id}`}
                      className="relative grid grid-cols-[160px_1.1fr_1fr_160px_220px] items-center gap-4 px-5 py-4 text-sm text-zinc-400 transition hover:bg-zinc-900/40"
                    >
                      <div className="flex items-center gap-2 text-zinc-200">
                        <Icon className={`size-4 ${style.icon}`} />
                        <span
                          className={`inline-flex max-w-full items-center truncate rounded px-2 py-0.5 text-xs font-medium ${style.badge}`}
                        >
                          {event.title}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">
                          {event.actor}
                        </p>
                        {event.userAgent && (
                          <p className="mt-1 truncate text-xs text-zinc-600">
                            {event.userAgent}
                          </p>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-medium text-zinc-200">
                          {event.detail}
                        </p>
                        {winnerCount && (
                          <p className="mt-1 text-xs text-emerald-300">
                            {winnerCount} ganador(es) seleccionados
                          </p>
                        )}
                      </div>
                      <p className="truncate text-xs text-zinc-500">
                        {event.ipAddress ?? "Sin IP"}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatDate(event.createdAt)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
