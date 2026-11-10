import type { Metadata } from "next";
import { DashboardRecentActivity } from "@/features/admin/dashboard/DashboardRecentActivity";
import { DashboardStatsGrid } from "@/features/admin/dashboard/DashboardStatsGrid";
import { DashboardRefresh } from "@/features/admin/dashboard/DashboardRefresh";
import { formatDashboardDate } from "@/features/admin/dashboard/dashboard.utils";
import { getDashboardSummary } from "@/features/admin/dashboard/services/dashboard.service";

export const metadata: Metadata = { title: "Resumen general" };

export default async function AdminDashboardPage() {
  const { stats, timeline, updatedAt } = await getDashboardSummary();

  return (
    <div className="space-y-7 text-[#171717]">
      <header className="flex flex-col gap-5 border-b border-[#FF5C35]/30 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="mb-2 text-sm font-medium text-[#595954]">Administración</p>
          <h1 className="text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
            Resumen general
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#595954]">
            Usuarios, espacios de trabajo y actividad de la plataforma.
          </p>
        </div>
        <DashboardRefresh updatedAt={updatedAt} updatedAtLabel={formatDashboardDate(new Date(updatedAt), true)} />
      </header>

      <div className="space-y-3">
        <DashboardStatsGrid stats={stats} />
      </div>
      <DashboardRecentActivity timeline={timeline} />
    </div>
  );
}
