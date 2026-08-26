import type { ReactNode } from "react";
import Link from "next/link";
import { LuArrowLeft } from "react-icons/lu";

type WorkspaceHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
};

export function WorkspaceHeader({
  title,
  description,
  eyebrow,
  actions,
  backHref,
  backLabel,
}: WorkspaceHeaderProps) {
  const hasTopRow = Boolean((backHref && backLabel) || eyebrow);

  console.log("[WORKSPACE_HEADER] current role context", {
    hasTopRow,
    backHref,
    backLabel,
    eyebrow: Boolean(eyebrow),
  });

  return (
    <header className="relative">
      <div className="absolute left-0 top-0 h-px w-16 bg-linear-to-r from-[#FF5C35] to-transparent" />
      {hasTopRow && (
        <div className="flex items-center justify-between mt-8">
          {backHref && backLabel && (
            <Link
              href={backHref}
              className="group inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[#000000]/55 transition-colors hover:text-[#FF5C35]"
            >
              <LuArrowLeft className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
              {backLabel}
            </Link>
          )}

          {eyebrow && (
            <div className="flex items-center gap-2 text-md mt-2 font-medium uppercase tracking-wider text-[#000000]/45">
              {eyebrow}
            </div>
          )}
        </div>
      )}

      <div
        className={`${hasTopRow ? "mt-4" : "pt-5"} flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6`}
      >
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-[#000000]">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#000000]/55">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-3">{actions}</div>
        )}
      </div>

      <div className="mt-6 h-px w-full bg-linear-to-r from-[#F5F5F5] via-[#F5F5F5]/60 to-transparent" />
    </header>
  );
}