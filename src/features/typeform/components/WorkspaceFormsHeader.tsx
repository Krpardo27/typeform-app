import Link from "next/link";
import { LuFilePlus2, LuFileText } from "react-icons/lu";

type Props = {
  workspaceId: string;
  workspaceName: string;
  totalItems: number;
  canCreateForms: boolean;
};

export function WorkspaceFormsHeader({
  workspaceId,
  workspaceName,
  totalItems,
  canCreateForms,
}: Props) {
  return (
    <header className="border-b border-zinc-800/60 pb-6">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
        <LuFileText className="size-3.5 text-[#C8A96E]" />
        <span className="truncate">{workspaceName}</span>
      </div>

      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white">Formularios</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Formularios recuperados desde Typeform para este workspace.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <p className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-400">
            {totalItems} total
          </p>

          {canCreateForms ? (
            <Link
              href={`/workspaces/${workspaceId}/forms/new`}
              className="inline-flex items-center gap-2 rounded-lg bg-[#C8A96E] px-3 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-[#d7b87b]"
            >
              <LuFilePlus2 className="size-4" />
              Crear
            </Link>
          ) : (
            <span className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-500">
              Solo lectura
            </span>
          )}
        </div>
      </div>
    </header>
  );
}