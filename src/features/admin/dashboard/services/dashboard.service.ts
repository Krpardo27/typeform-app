import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { buildAuditTimeline } from "@/features/admin/audit/services/audit-timeline.service";
import { DASHBOARD_ACTIVITY_LIMIT, getDashboardPeriods } from "../dashboard.utils";
import type { DashboardStats } from "../dashboard.types";

export async function getDashboardSummary() {
  await requireSuperAdmin();
  const now = new Date();
  const { startOfMonth, sevenDaysAgo } = getDashboardPeriods(now);
  const createdThisMonth = { gte: startOfMonth, lte: now };
  const appWorkspace = { createdFromApp: true };

  const [auditLogs, sessions, usersByStatus, usersCreatedThisMonth,
    totalWorkspaces, workspacesCreatedThisMonth, totalForms, formsCreatedLast7Days] =
    await Promise.all([
      prisma.auditLog.findMany({
        where: { createdAt: { lte: now } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: DASHBOARD_ACTIVITY_LIMIT,
        select: {
          id: true,
          action: true,
          actorName: true,
          actorEmail: true,
          formTitle: true,
          workspaceName: true,
          targetId: true,
          ipAddress: true,
          userAgent: true,
          metadata: true,
          createdAt: true,
        },
      }),
      prisma.session.findMany({
        where: { createdAt: { lte: now } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: DASHBOARD_ACTIVITY_LIMIT,
        select: {
          id: true,
          createdAt: true,
          ipAddress: true,
          userAgent: true,
          user: { select: { name: true, email: true } },
        },
      }),
      prisma.user.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.user.count({ where: { createdAt: createdThisMonth } }),
      prisma.workspace.count({ where: appWorkspace }),
      prisma.workspace.count({
        where: { ...appWorkspace, createdAt: createdThisMonth },
      }),
      prisma.form.count({ where: { workspace: appWorkspace } }),
      prisma.form.count({
        where: {
          workspace: appWorkspace,
          createdAt: { gte: sevenDaysAgo, lte: now },
        },
      }),
    ]);

  const statuses = { ACTIVE: 0, PENDING: 0, REJECTED: 0 };
  for (const group of usersByStatus) statuses[group.status] = group._count._all;

  const stats: DashboardStats = {
    totalUsers: statuses.ACTIVE + statuses.PENDING + statuses.REJECTED,
    activeUsers: statuses.ACTIVE,
    pendingUsers: statuses.PENDING,
    rejectedUsers: statuses.REJECTED,
    usersCreatedThisMonth,
    totalWorkspaces,
    workspacesCreatedThisMonth,
    totalForms,
    formsCreatedLast7Days,
  };

  return {
    stats,
    timeline: buildAuditTimeline(auditLogs, sessions).slice(0, DASHBOARD_ACTIVITY_LIMIT),
    updatedAt: new Date().toISOString(),
  };
}