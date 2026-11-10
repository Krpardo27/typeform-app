import type { ReactNode } from "react";
import Link from "next/link";
import { LuArrowLeft } from "react-icons/lu";
import { WorkspaceRadioLogo, type WorkspaceRadioIdentity } from "./WorkspaceRadioLogo";

type Props = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  radio?: WorkspaceRadioIdentity;
};

export function WorkspacePageHeader({ title, description, actions, backHref, radio }: Props) {
  return (
    <header className="min-w-0 border-b border-[#E5E5E5] pb-6">
      {backHref ? (
        <Link href={backHref} className="-ml-1 mb-3 inline-flex min-h-11 items-center gap-2 rounded-sm px-1 text-sm text-[#595954] underline-offset-4 hover:text-[#A53318] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35]">
          <LuArrowLeft aria-hidden="true" className="size-3.5 shrink-0" />
          Volver a workspaces
        </Link>
      ) : (
        <p className="mb-2 text-sm font-medium text-[#595954]">Administración</p>
      )}
      <div className="flex min-w-0 flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
          {radio && <WorkspaceRadioLogo workspace={radio} size={100} fallback="none" />}
          <div className="min-w-0 flex-1">
            <h1 className="wrap-anywhere text-2xl font-semibold leading-tight tracking-tight text-[#171717]">{title}</h1>
            {description && <div className="mt-2 text-sm leading-6 text-[#595954]">{description}</div>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </header>
  );
}