import Link from "next/link";
import { LuArrowRight, LuCircleAlert } from "react-icons/lu";
import type { AuditTimelineEvent } from "@/features/admin/audit/services/audit-timeline.service";
import {
  DASHBOARD_ACTIVITY_LIMIT,
  formatDashboardDate,
  getActivityContext,
  getActivityTone,
} from "./dashboard.utils";

type Props = {
  timeline: AuditTimelineEvent[];
};

const titleColors = {
  neutral: "text-[#171717]",
  attention: "text-[#854D0E]",
  critical: "text-[#9B231B]",
};

export function DashboardRecentActivity({ timeline }: Props) {
  const recentEvents = timeline.slice(0, DASHBOARD_ACTIVITY_LIMIT);

  return (
    <section aria-labelledby="recent-activity-title" className="rounded-md border border-[#D1D1CD] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-b border-[#E8E8E6] px-5 py-4">
        <div>
          <h2 id="recent-activity-title" className="text-base font-semibold text-[#171717]">
            Actividad reciente
          </h2>
          <p className="mt-1 text-sm leading-5 text-[#595954]">
            Últimos {DASHBOARD_ACTIVITY_LIMIT} eventos de auditoría y sesiones registradas.
          </p>
        </div>
        <Link
          href="/admin/auditoria"
          className="inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-medium text-[#A53318] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35]"
        >
          Ver auditoría
          <LuArrowRight aria-hidden="true" className="size-4 shrink-0" />
        </Link>
      </div>
      {recentEvents.length === 0 ? (
        <div className="px-5 py-8">
          <p className="text-sm font-medium text-[#171717]">Todavía no hay actividad.</p>
          <p className="mt-2 max-w-lg text-sm leading-6 text-[#595954]">
            Aquí aparecerán las acciones registradas y los nuevos accesos a la plataforma.
          </p>
        </div>
      ) : (
        <ol aria-label="Eventos más recientes, del más nuevo al más antiguo" className="divide-y divide-[#E8E8E6]">
          {recentEvents.map((event) => {
            const tone = getActivityTone(event);
            return (
              <li key={`${event.source}-${event.id}`} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <div className="min-w-0">
                  <p className={`flex items-start gap-2 text-sm leading-6 font-medium ${titleColors[tone]}`}>
                    {tone !== "neutral" && <LuCircleAlert aria-hidden="true" className="mt-1 size-4 shrink-0" />}
                    <span className="wrap-anywhere">{event.title}</span>
                  </p>
                  <p className="mt-1 text-sm leading-5 text-[#595954] wrap-anywhere">
                    {getActivityContext(event)}
                  </p>
                </div>
                <time dateTime={event.createdAt.toISOString()} className="shrink-0 text-sm leading-6 text-[#595954] sm:text-right">
                  {formatDashboardDate(event.createdAt)} UTC
                </time>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
