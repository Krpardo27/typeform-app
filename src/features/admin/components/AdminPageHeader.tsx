import type { ReactNode } from "react";

type AdminPageHeaderProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  leading?: ReactNode;
};

export function AdminPageHeader({
  eyebrow = "Administración",
  title,
  description,
  actions,
  leading,
}: AdminPageHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
      <div className="min-w-0">
        {leading}

        {eyebrow && (
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            {eyebrow}
          </p>
        )}

        <h1 className="mt-2 text-2xl font-bold text-white">{title}</h1>

        {description && (
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
          {actions}
        </div>
      )}
    </header>
  );
}