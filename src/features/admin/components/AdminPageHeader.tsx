import type { ReactNode } from "react";
import Link from "next/link";
import { LuArrowLeft } from "react-icons/lu";

type AdminPageHeaderProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  leading?: ReactNode;
  backHref?: string;
  backLabel?: string;
};

export function AdminPageHeader({
  eyebrow = "Administración",
  title,
  description,
  actions,
  leading,
  backHref,
  backLabel,
}: AdminPageHeaderProps) {
  const topLeading = backHref && backLabel ? (
    <Link
      href={backHref}
      className="group inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-600 transition-colors hover:text-[#C8A96E]"
    >
      <LuArrowLeft className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
      {backLabel}
    </Link>
  ) : (
    leading
  );

  const hasTopRow = Boolean(topLeading || eyebrow);

  return (
    <header className="relative mb-8 pb-8">
      <div className="absolute left-0 top-0 h-px w-16 bg-linear-to-r from-[#C8A96E] to-transparent" />

      {hasTopRow && (
        <div className="flex items-center gap-3 pt-5">
          {topLeading}
          {eyebrow && (
            <p
              className={`${topLeading ? "ml-auto" : ""} text-xs font-medium uppercase tracking-wider text-zinc-500`}
            >
              {eyebrow}
            </p>
          )}
        </div>
      )}

      <div
        className={`${hasTopRow ? "mt-4" : "pt-5"} flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6`}
      >
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
          {description && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-3">{actions}</div>
        )}
      </div>

      <div className="mt-6 h-px w-full bg-linear-to-r from-zinc-800 via-zinc-800/40 to-transparent" />
    </header>
  );
}
