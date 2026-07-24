import { LuRadio } from "react-icons/lu";

type WorkspaceHomeHeaderProps = {
  workspaceName: string;
  workspaceRole: string;
};

export function WorkspaceHomeHeader({
  workspaceName,
  workspaceRole,
}: WorkspaceHomeHeaderProps) {
  return (
    <header className="border-b border-zinc-800/60 pb-6">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
        <LuRadio className="size-3.5 text-[#C8A96E]" />
        <span>Workspace</span>
      </div>

      <div className="mt-2 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{workspaceName}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Administra los formularios disponibles para esta radio o marca.
          </p>
        </div>

        <span className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-400">
          Rol: {workspaceRole}
        </span>
      </div>
    </header>
  );
}