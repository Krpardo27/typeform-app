import type { ReactNode } from "react";
import Link from "next/link";
import { LuArrowUpRight } from "react-icons/lu";

interface DashboardStatCardProps {
  title: string;
  value: string;
  periodLabel: string;
  detail: ReactNode;
  href: string;
  linkLabel: string;
}

export function DashboardStatCard({
  title,
  value,
  periodLabel,
  detail,
  href,
  linkLabel,
}: DashboardStatCardProps) {
  return (
    <article className="flex min-w-0 flex-col p-5">
      <h2 className="text-sm font-medium text-[#595954]">{title}</h2>
      <p className="mt-3 text-3xl leading-none font-semibold tracking-tight text-[#171717] tabular-nums wrap-anywhere">
        {value}
      </p>
      <p className="mt-2 text-sm leading-5 text-[#595954]">{periodLabel}</p>
      <div className="mt-3 text-sm leading-5 text-[#595954]">{detail}</div>
      <Link
        href={href}
        className="mt-auto inline-flex min-h-11 items-center gap-1.5 self-start rounded-sm pt-3 text-sm font-medium text-[#A53318] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35]"
      >
        {linkLabel}
        <LuArrowUpRight aria-hidden="true" className="size-3.5 shrink-0" />
      </Link>
    </article>
  );
}