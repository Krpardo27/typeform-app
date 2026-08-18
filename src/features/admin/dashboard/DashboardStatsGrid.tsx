import { LuFileText, LuLayoutGrid, LuUsers } from "react-icons/lu";
import { DashboardStatCard } from "./DashboardStatCard";

type DashboardStatsData = {
  totalUsers: number;
  usersThisMonth: number;
  totalWorkspaces: number;
  workspacesThisMonth: number;
  totalForms: number;
  formsThisWeek: number;
};

export function DashboardStatsGrid({
  totalUsers,
  usersThisMonth,
  totalWorkspaces,
  workspacesThisMonth,
  totalForms,
  formsThisWeek,
}: DashboardStatsData) {
  const formatNumber = (value: number) =>
    new Intl.NumberFormat("es-CL").format(value);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <DashboardStatCard
        title="Usuarios"
        value={formatNumber(totalUsers)}
        badge={{
          label: `${usersThisMonth > 0 ? "+" : ""}${usersThisMonth} este mes`,
          variant: usersThisMonth > 0 ? "success" : "neutral",
        }}
        icon={<LuUsers className="size-5" />}
      />

      <DashboardStatCard
        title="Workspaces"
        value={formatNumber(totalWorkspaces)}
        badge={{
          label: `${workspacesThisMonth > 0 ? "+" : ""}${workspacesThisMonth} este mes`,
          variant: workspacesThisMonth > 0 ? "success" : "neutral",
        }}
        icon={<LuLayoutGrid className="size-5" />}
      />

      <DashboardStatCard
        title="Formularios"
        value={formatNumber(totalForms)}
        badge={{
          label: `${formsThisWeek > 0 ? "+" : ""}${formsThisWeek} esta semana`,
          variant: formsThisWeek > 0 ? "success" : "neutral",
        }}
        icon={<LuFileText className="size-5" />}
      />
    </div>
  );
}