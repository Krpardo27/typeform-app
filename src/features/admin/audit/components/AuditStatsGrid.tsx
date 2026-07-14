import type { AuditTimelineEvent } from "../services/audit-timeline.service";

type Props = {
  timeline: AuditTimelineEvent[];
  sessionCount: number;
  auditLogCount: number;
};

export function AuditStatsGrid({ timeline, sessionCount, auditLogCount }: Props) {
  return (
    <section className="grid gap-4 md:grid-cols-4">
      <article className="rounded-xl border border-zinc-800 bg-[#111113] p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Eventos
        </p>
        <p className="mt-3 text-2xl font-bold text-white">{timeline.length}</p>
      </article>

      <article className="rounded-xl border border-zinc-800 bg-[#111113] p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Inicios de sesion
        </p>
        <p className="mt-3 text-2xl font-bold text-white">{sessionCount}</p>
      </article>

      <article className="rounded-xl border border-zinc-800 bg-[#111113] p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Eventos auditados
        </p>
        <p className="mt-3 text-2xl font-bold text-white">{auditLogCount}</p>
      </article>

      <article className="rounded-xl border border-zinc-800 bg-[#111113] p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          IP registrada
        </p>
        <p className="mt-3 text-2xl font-bold text-white">
          {timeline.filter((event) => event.ipAddress).length}
        </p>
      </article>
    </section>
  );
}