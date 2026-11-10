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
      className="group -ml-1 inline-flex min-h-11 max-w-full items-center gap-2 rounded-sm px-1 py-2 text-sm font-medium text-[#595954] underline-offset-4 transition-colors hover:text-[#A33116] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A33116] motion-reduce:transition-none"
    >
      <LuArrowLeft aria-hidden="true" className="size-3.5 shrink-0 transition-transform duration-200 ease-out group-hover:-translate-x-0.5 motion-reduce:translate-x-0 motion-reduce:transition-none" />
      <span className="min-w-0 wrap-anywhere">{backLabel}</span>
    </Link>
  ) : (
    leading
  );

  const hasTopRow = Boolean(topLeading || eyebrow);

  return (
    <header className="mb-6 min-w-0 border-b border-[#E5E5E5] pb-5 sm:mb-8 sm:pb-6">
      {hasTopRow && (
        <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1">
          {topLeading && <div className="min-w-0 max-w-full wrap-anywhere">{topLeading}</div>}
          {eyebrow && (
            <p
              className="min-w-0 text-sm font-medium text-[#737373] wrap-anywhere"
            >
              {eyebrow}
            </p>
          )}
        </div>
      )}

      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold leading-tight tracking-tight text-[#171717] wrap-anywhere">{title}</h1>
          {description && (
            <div className="mt-2 max-w-2xl text-sm leading-6 text-[#595954] wrap-anywhere">
              {description}
            </div>
          )}
        </div>
        {actions && (
          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 wrap-anywhere *:min-w-0 *:max-w-full lg:max-w-[45%] lg:shrink-0 lg:justify-end">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
