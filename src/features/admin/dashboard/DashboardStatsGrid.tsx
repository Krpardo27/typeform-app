import { LuActivity, LuChartPie, LuServer, LuUsers } from "react-icons/lu";
import { DashboardStatCard } from "./DashboardStatCard";

export function DashboardStatsGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <DashboardStatCard
        title="Total Usuarios"
        value="1,248"
        badge={{ label: "+12 este mes", variant: "success" }}
        icon={<LuUsers className="size-5" />}
      />
      <DashboardStatCard
        title="Workspaces Activos"
        value="84"
        badge={{ label: "4 creados hoy", variant: "neutral" }}
        icon={<LuChartPie className="size-5" />}
      />
      <DashboardStatCard
        title="Formularios Totales"
        value="327"
        badge={{ label: "+9 esta semana", variant: "success" }}
        icon={<LuActivity className="size-5" />}
      />
      <DashboardStatCard
        title="Rendimiento API"
        value="99.9%"
        badge={{ label: "Estable", variant: "success" }}
        icon={<LuServer className="size-5" />}
      />
    </div>
  );
}
