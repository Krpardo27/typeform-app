import { LuRadio } from "react-icons/lu";

type WorkspaceHomeHeaderProps = {
  workspaceName: string;
  workspaceRole: string;
  currentUserLabel: string;
};

export function WorkspaceHomeHeader({
  workspaceName,
  workspaceRole,
  currentUserLabel,
}: WorkspaceHomeHeaderProps) {

  console.log('Editor', workspaceRole)

  return (
    <header className="mt-6 border-b border-[#F5F5F5] pb-6 sm:mt-8 sm:pb-7">
      {/* Eyebrow */}
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40 sm:text-xs">
        <LuRadio className="size-3.5 shrink-0 text-[#FF5C35]" />
        <span>Workspace</span>
      </div>

      <div className="mt-3 flex flex-col gap-5 sm:mt-4 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
        {/* Main information */}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-black sm:text-3xl">
            {workspaceName}
          </h1>

          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-black/50 sm:mt-2">
            Administra los formularios disponibles para esta radio o marca.
          </p>
        </div>

        {/* Workspace context */}
        <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:w-auto sm:flex-nowrap sm:gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-black/40 text-md">Rol</span>
            <span className="font-semibold text-black/75">{workspaceRole}</span>
          </div>

          <span className="hidden h-3.5 w-px bg-black/10 sm:block" />

          <div className="flex min-w-0 items-center gap-1.5">
            <span className="text-black/40 text-md">Usuario</span>
            <span
              className="max-w-[180px] truncate font-medium text-black/65 sm:max-w-56"
              title={currentUserLabel}
            >
              {currentUserLabel}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
