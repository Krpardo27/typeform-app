import { prisma } from "@/lib/prisma";
import { AdminAuditHeader } from "@/features/admin/audit/components/AdminAuditHeader";
import { AuditStatsGrid } from "@/features/admin/audit/components/AuditStatsGrid";
import { AuditTimeline } from "@/features/admin/audit/components/AuditTimeline";
import { buildAuditTimeline } from "@/features/admin/audit/services/audit-timeline.service";

export default async function AdminAuditPage() {
  const [auditLogs, sessions] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.session.findMany({
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
      <AuditTimeline timeline={timeline} />
    </div>
  );
}