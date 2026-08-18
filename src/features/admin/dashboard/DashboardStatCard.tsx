import { ReactNode } from "react";

interface DashboardStatCardProps {
  title: string;
  value: string;
  badge?: {
    label: string;
    variant?: "success" | "warning" | "neutral";
  };
  icon?: ReactNode;
}

const badgeClasses = {
  success: "text-emerald-400 bg-emerald-400/10",
  warning: "text-amber-400 bg-amber-400/10",
  neutral: "text-zinc-400 bg-zinc-800",
};

export function DashboardStatCard({
  title,
  value,
  badge,
  icon,
}: DashboardStatCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-[#0f0f0f] p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-400">{title}</p>

        {icon && (
          <span className="flex size-5 items-center justify-center text-zinc-600">
            {icon}
          </span>
        )}
      </div>

      <p className="text-3xl font-bold tracking-tight text-zinc-100">
        {value}
      </p>

      {badge && (
        <span
          className={`self-start rounded-full px-2.5 py-0.5 text-xs font-medium ${
            badgeClasses[badge.variant ?? "neutral"]
          }`}
        >
          {badge.label}
        </span>
      )}
    </div>
  );
}