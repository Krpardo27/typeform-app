import { prisma } from "@/lib/prisma";
import { AdminAuditHeader } from "@/features/admin/audit/components/AdminAuditHeader";
import { AuditDateFilter } from "@/features/admin/audit/components/AuditDateFilter";
import { AuditStatsGrid } from "@/features/admin/audit/components/AuditStatsGrid";
import { AuditTimeline } from "@/features/admin/audit/components/AuditTimeline";
import { buildAuditTimeline } from "@/features/admin/audit/services/audit-timeline.service";

export const dynamic = "force-dynamic";

function normalizeDateParam(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  return value;
}

function parseDateParam(value?: string) {
  const normalizedValue = normalizeDateParam(value);

  if (!normalizedValue) {
    return undefined;
  }

  const date = new Date(`${normalizedValue}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function getAuditDateRange(from?: string, to?: string) {
  const startDate = parseDateParam(from);
  const endDate = parseDateParam(to);

  if (!startDate && !endDate) {
    return undefined;
  }

  return {
    ...(startDate ? { gte: startDate } : {}),
    ...(endDate
      ? { lt: new Date(endDate.getTime() + 24 * 60 * 60 * 1000) }
      : {}),
  };
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
  }>;
}) {
  const rawSearchParams = await searchParams;
  const from = normalizeDateParam(rawSearchParams.from);
  const to = normalizeDateParam(rawSearchParams.to);
  const createdAt = getAuditDateRange(from, to);
  const where = createdAt ? { createdAt } : undefined;

  const [auditLogs, sessions] = await Promise.all([
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
      <AuditStatsGrid
        timeline={timeline}
        sessionCount={sessions.length}
        auditLogCount={auditLogs.length}
      />
      <AuditDateFilter from={from} to={to} />

      <AuditTimeline timeline={timeline} />
    </div>
  );
}