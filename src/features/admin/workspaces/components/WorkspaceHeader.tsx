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

  return (
    <header className="relative pb-8">
      {/* línea de acento superior, ancla visual del bloque */}
      <div className="absolute left-0 top-0 h-px w-16 bg-linear-to-r from-[#C8A96E] to-transparent" />

      {hasTopRow && (
        <div className="flex items-center justify-between pt-5 mt-5">
          {backHref && backLabel && (
            <Link
              href={backHref}
              className="group inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-600 transition-colors hover:text-[#C8A96E]"
            >
              <LuArrowLeft className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
              {backLabel}
            </Link>
          )}

          {eyebrow && (
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
              {eyebrow}
            </div>
          )}
        </div>
      )}

      <div
        className={`${hasTopRow ? "mt-4" : "pt-5"} flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6`}
      >
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {title}
          </h1>
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