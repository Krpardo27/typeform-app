import Link from "next/link";
import { LuArrowUpRight, LuDatabase, LuUsers } from "react-icons/lu";
import type { TypeformWorkspace } from "@/features/typeform/services/typeform.service";

type Props = {
  typeformWorkspace: TypeformWorkspace;
  appWorkspace?: {
    id: string;
    name: string;
    typeformId: string;
    _count: {
      users: number;
    };
  };
};

export function WorkspaceCard({ typeformWorkspace, appWorkspace }: Props) {
  const workspaceName =
    typeformWorkspace.name ?? appWorkspace?.name ?? "Sin nombre";
  const isRegisteredInApp = Boolean(appWorkspace);

  return (
    <article className="group rounded-2xl border border-zinc-800/80 bg-linear-to-b from-zinc-950 to-zinc-900/70 p-4 shadow-sm transition hover:border-cyan-400/30 hover:shadow-cyan-500/10 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="line-clamp-2 wrap-break-word text-base font-semibold leading-snug text-zinc-100 sm:truncate sm:text-lg">
            {workspaceName}
          </h2>
          <p className="mt-1 truncate text-[11px] text-zinc-500 sm:text-xs">
            ID workspace: {typeformWorkspace.id}
          </p>
        </div>
        <Link
          href={`/admin/workspaces/${typeformWorkspace.id}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900/70 text-zinc-400 transition group-hover:border-cyan-400/40 group-hover:text-cyan-300 hover:scale-[1.02] sm:size-9"
        >
          <LuArrowUpRight className="size-4" />
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-zinc-300 sm:mt-5">
        <span className="flex items-center gap-2 rounded-full border border-zinc-700/70 bg-zinc-900/70 px-2.5 py-1">
          <LuUsers className="size-4 shrink-0 text-cyan-300" />
          {appWorkspace?._count.users ?? 0} usuarios asignados
        </span>

        <span
          className={`flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs ${
            isRegisteredInApp
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-zinc-700/70 bg-zinc-900/70 text-zinc-400"
          }`}
        >
          <LuDatabase className="size-4 shrink-0" />
          {isRegisteredInApp ? "Registrado en app" : "Solo en Typeform"}
        </span>
      </div>
    </article>
  );
}