import type { ReactNode } from "react";
import Link from "next/link";
import { LuArrowLeft } from "react-icons/lu";

type WorkspaceHeaderProps = {
  title: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
};

export function WorkspaceHeader({
  title,
  eyebrow,
  actions,
  backHref,
  backLabel,
}: WorkspaceHeaderProps) {
  return (
    <header className="min-w-0 border-b border-[#E5E5E5] pb-6 pt-5">
      {backHref && backLabel && (
        <div className="mb-4">
          <Link
            href={backHref}
            className="inline-flex min-h-10 items-center gap-2 rounded-sm text-md font-medium text-[#595954] underline-offset-4 transition-colors hover:text-[#A33116] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A33116] motion-reduce:transition-none"
          >
            <LuArrowLeft aria-hidden="true" className="size-3.5 shrink-0" />
            {backLabel}
          </Link>
        </div>
      )}

      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <div className="mb-1.5 flex min-w-0 items-center gap-2 text-sm font-medium leading-5 text-[#595954]">
              {eyebrow}
            </div>
          )}
          <h1 className="wrap-anywhere text-2xl font-semibold leading-tight tracking-tight text-[#171717]">
            {title}
          </h1>
        </div>

        {actions && (
          <div className="flex min-w-0 flex-wrap items-center gap-3 lg:justify-end justify-between">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
