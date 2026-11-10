import { DashboardStatCard } from "./DashboardStatCard";
import type { DashboardStats } from "./dashboard.types";

export function DashboardStatsGrid({ stats }: { stats: DashboardStats }) {
  const formatNumber = (value: number) =>
    new Intl.NumberFormat("es-CL").format(value);

  return (
    <section
      aria-label="Resumen de la plataforma"
      className="grid grid-cols-1 divide-y divide-[#E8E8E6] rounded-md border border-[#FF5C35]/30 bg-white md:grid-cols-3 md:divide-x md:divide-y-0"
    >
      <DashboardStatCard
        title="Usuarios"
        value={formatNumber(stats.totalUsers)}
        periodLabel={`${formatNumber(stats.usersCreatedThisMonth)} creados este mes`}
        detail={
          <dl className="flex flex-wrap gap-x-3 gap-y-1">
            {[
              ["Activos", stats.activeUsers],
              ["Pendientes", stats.pendingUsers],
              ["Rechazados", stats.rejectedUsers],
            ].map(([label, count]) => (
              <div key={label} className="flex gap-1">
                <dt>{label}:</dt>
                <dd className="font-medium text-[#171717] tabular-nums">{formatNumber(Number(count))}</dd>
              </div>
            ))}
          </dl>
        }
        href="/admin/users"
        linkLabel="Ver usuarios"
      />
      <DashboardStatCard
        title="Workspaces"
        value={formatNumber(stats.totalWorkspaces)}
        periodLabel={`${formatNumber(stats.workspacesCreatedThisMonth)} creados este mes`}
        detail="Espacios creados desde esta aplicación."
        href="/admin/workspaces"
        linkLabel="Ver workspaces"
      />
      <DashboardStatCard
        title="Formularios"
        value={formatNumber(stats.totalForms)}
        periodLabel={`${formatNumber(stats.formsCreatedLast7Days)} creados en los últimos 7 días`}
        detail="Registros locales de los workspaces de la aplicación."
        href="/admin/workspaces"
        linkLabel="Explorar workspaces"
      />
    </section>
  );
}