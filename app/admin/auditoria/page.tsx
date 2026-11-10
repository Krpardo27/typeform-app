import { prisma } from "@/lib/prisma";
import { AdminAuditHeader } from "@/features/admin/audit/components/AdminAuditHeader";
import { AuditDateFilter } from "@/features/admin/audit/components/AuditDateFilter";
import { AuditStatsGrid } from "@/features/admin/audit/components/AuditStatsGrid";
import { AuditTimeline } from "@/features/admin/audit/components/AuditTimeline";
import { buildAuditTimeline } from "@/features/admin/audit/services/audit-timeline.service";
import { getAuditDateFilter } from "@/features/admin/audit/utils/audit-date-range";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string | string[];
    to?: string | string[];
  }>;
}) {
  const rawSearchParams = await searchParams;
  const { from, to, error, createdAt } = getAuditDateFilter(rawSearchParams.from, rawSearchParams.to);
  const where = createdAt ? { createdAt } : undefined;

  const [auditLogs, sessions] = error ? [[], []] : await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.session.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const timeline = buildAuditTimeline(auditLogs, sessions);

  return (
    <div>
      <AdminAuditHeader />
      {!error && (
        <AuditStatsGrid
          timeline={timeline}
          sessionCount={sessions.length}
          auditLogCount={auditLogs.length}
        />
      )}
      <AuditDateFilter from={from} to={to} error={error} />

      {!error && <AuditTimeline timeline={timeline} />}
    </div>
  );
}