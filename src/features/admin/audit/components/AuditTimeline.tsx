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
      badge: "bg-[#16A34A]/10 text-[#16A34A]",
      icon: "text-[#16A34A]",
    };
  }

  if (eventType === "MEMBER_REVOKED") {
    return {
      badge: "bg-[#DC2626]/10 text-[#DC2626]",
      icon: "text-[#DC2626]",
    };
  }

  if (eventType === "OTP_RATE_LIMITED") {
    return {
      badge: "bg-[#CA8A04]/10 text-[#CA8A04]",
      icon: "text-[#CA8A04]",
    };
  }

  if (action === "WINNER_SELECTED") {
    return {
      badge: "bg-[#16A34A]/10 text-[#16A34A]",
      icon: "text-[#16A34A]",
    };
  }

  if (action === "SENSITIVE_DATA_VIEWED") {
    return {
      badge: "bg-[#DC2626]/10 text-[#DC2626]",
      icon: "text-[#DC2626]",
    };
  }

  if (action === "FORM_CLONED") {
    return {
      badge: "bg-sky-100 text-sky-700",
      icon: "text-sky-700",
    };
  }

  if (action === "OTP_REQUESTED") {
    return {
      badge: "bg-violet-100 text-violet-700",
      icon: "text-violet-700",
    };
  }

  if (action === "LOGIN_SESSION_CREATED") {
    return {
      badge: "bg-sky-100 text-sky-700",
      icon: "text-sky-700",
    };
  }

  return {
    badge: "bg-[#F5F5F5] text-[#737373]",
    icon: "text-[#737373]",
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
    <section className="mt-8 rounded-xl border border-[#E5E5E5] bg-[#FFFFFF]">
      {timeline.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-[#737373]">
          Todavía no hay eventos de auditoría.
        </div>
      ) : (
        <>
          {/* Mobile: Cards */}
          <div className="divide-y divide-[#E5E5E5] lg:hidden">
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
                    <span className="ml-auto text-xs text-[#737373] whitespace-nowrap">
                      {formatDate(event.createdAt)}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#171717]">{event.actor}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-[#737373]">{event.detail}</p>
                    {winnerCount && (
                      <p className="mt-1 text-xs text-[#16A34A]">
                        {winnerCount} ganador(es) seleccionados
                      </p>
                    )}
                    {event.userAgent && (
                      <p className="mt-1 line-clamp-1 text-xs text-[#737373]">{event.userAgent}</p>
                    )}
                  </div>

                  {event.ipAddress && (
                    <p className="text-xs text-[#737373]">{event.ipAddress}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop: Table */}
          <div className="hidden lg:block overflow-x-auto">
            <div className="min-w-230">
              <div className="grid grid-cols-[160px_1.1fr_1fr_160px_220px] gap-4 border-b border-[#E5E5E5] px-5 py-3 text-xs font-medium uppercase tracking-wider text-[#737373]">
                <span>Evento</span>
                <span>Actor</span>
                <span>Detalle</span>
                <span>IP</span>
                <span>Fecha</span>
              </div>

              <div className="max-h-[70vh] divide-y divide-[#E5E5E5] overflow-y-auto">
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
                      className="relative grid grid-cols-[160px_1.1fr_1fr_160px_220px] items-center gap-4 px-5 py-4 text-sm text-[#737373] transition hover:bg-[#F5F5F5]"
                    >
                      <div className="flex items-center gap-2 text-[#171717]">
                        <Icon className={`size-4 ${style.icon}`} />
                        <span
                          className={`inline-flex max-w-full items-center truncate rounded px-2 py-0.5 text-xs font-medium ${style.badge}`}
                        >
                          {event.title}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-medium text-[#171717]">
                          {event.actor}
                        </p>
                        {event.userAgent && (
                          <p className="mt-1 truncate text-xs text-[#737373]">
                            {event.userAgent}
                          </p>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-medium text-[#171717]">
                          {event.detail}
                        </p>
                        {winnerCount && (
                          <p className="mt-1 text-xs text-[#16A34A]">
                            {winnerCount} ganador(es) seleccionados
                          </p>
                        )}
                      </div>
                      <p className="truncate text-xs text-[#737373]">
                        {event.ipAddress ?? "Sin IP"}
                      </p>
                      <p className="text-xs text-[#737373]">
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
