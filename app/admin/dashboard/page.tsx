import { prisma } from "@/lib/prisma";
import { buildAuditTimeline } from "@/features/admin/audit/services/audit-timeline.service";
import { DashboardRecentActivity } from "@/features/admin/dashboard/DashboardRecentActivity";
import { DashboardStatsGrid } from "@/features/admin/dashboard/DashboardStatsGrid";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";

export default async function AdminDashboardPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);

  const [auditLogs, sessions, totalUsers, usersThisMonth, totalWorkspaces, workspacesThisMonth, totalForms, formsThisWeek] =
    await Promise.all([
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
      prisma.user.count(),
      prisma.user.count({
        where: {
          createdAt: {
            gte: startOfMonth,
          },
        },
      }),
      prisma.workspace.count(),
      prisma.workspace.count({
        where: {
          createdAt: {
            gte: startOfMonth,
          },
        },
      }),
      prisma.form.count(),
      prisma.form.count({
        where: {
          createdAt: {
            gte: startOfWeek,
          },
        },
      }),
    ]);

  const timeline = buildAuditTimeline(auditLogs, sessions).slice(0, 10);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Dashboard Global"
        description="Bienvenido al panel de control general del sistema."
        eyebrow="Administración"
      />

      <DashboardStatsGrid
        totalUsers={totalUsers}
        usersThisMonth={usersThisMonth}
        totalWorkspaces={totalWorkspaces}
        workspacesThisMonth={workspacesThisMonth}
        totalForms={totalForms}
        formsThisWeek={formsThisWeek}
      />

      <DashboardRecentActivity timeline={timeline} />
    </div>
  );
}
