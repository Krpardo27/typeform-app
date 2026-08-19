import type { AuditTimelineEvent } from "../services/audit-timeline.service";

type Props = {
  timeline: AuditTimelineEvent[];
  sessionCount: number;
  auditLogCount: number;
};

export function AuditStatsGrid({ timeline, sessionCount, auditLogCount }: Props) {
  return (
    <section className="grid gap-4 md:grid-cols-4">
      <article className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-[#737373]">
          Eventos
        </p>
        <p className="mt-3 text-2xl font-bold text-[#171717]">{timeline.length}</p>
      </article>

      <article className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-[#737373]">
          Inicios de sesión
        </p>
        <p className="mt-3 text-2xl font-bold text-[#171717]">{sessionCount}</p>
      </article>

      <article className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-[#737373]">
          Eventos auditados
        </p>
        <p className="mt-3 text-2xl font-bold text-[#171717]">{auditLogCount}</p>
      </article>

      <article className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-[#737373]">
          IP registrada
        </p>
        <p className="mt-3 text-2xl font-bold text-[#171717]">
          {timeline.filter((event) => event.ipAddress).length}
        </p>
      </article>
    </section>
  );
}