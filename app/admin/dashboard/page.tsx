import { prisma } from "@/lib/prisma";
import { buildAuditTimeline } from "@/features/admin/audit/services/audit-timeline.service";
import { DashboardRecentActivity } from "@/features/admin/components/dashboard/DashboardRecentActivity";
import { DashboardStatsGrid } from "@/features/admin/components/dashboard/DashboardStatsGrid";

export default async function AdminDashboardPage() {
  const [auditLogs, sessions] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.session.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
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

  const timeline = buildAuditTimeline(auditLogs, sessions).slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Dashboard Global
        </h1>
        <p className="text-sm text-zinc-400">
          Bienvenido al panel de control general del sistema.
        </p>
      </div>

      <DashboardStatsGrid />

      <DashboardRecentActivity timeline={timeline} />
    </div>
  );
}
