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
  success: "text-[#16A34A] bg-[#16A34A]/10",
  warning: "text-[#CA8A04] bg-[#CA8A04]/10",
  neutral: "text-[#737373] bg-[#F5F5F5]",
};

export function DashboardStatCard({
  title,
  value,
  badge,
  icon,
}: DashboardStatCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[#737373]">{title}</p>

        {icon && (
          <span className="flex size-5 items-center justify-center text-[#737373]">
            {icon}
          </span>
        )}
      </div>

      <p className="text-3xl font-bold tracking-tight text-[#171717]">
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