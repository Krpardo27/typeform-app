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

  return (
    <article className="rounded-xl border border-zinc-800 bg-[#111113] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="line-clamp-2 break-words text-base font-semibold leading-snug text-white sm:truncate sm:text-lg">
            {workspaceName}
          </h2>
          <p className="mt-1 truncate text-[11px] text-zinc-500 sm:text-xs">
            Typeform workspace ID: {typeformWorkspace.id}
          </p>
        </div>
        <Link
          href={`/admin/workspaces/${typeformWorkspace.id}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition hover:border-[#C8A96E] hover:text-[#C8A96E] sm:size-9"
        >
          <LuArrowUpRight className="size-4" />
        </Link>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-zinc-400 sm:mt-5">
        <span className="flex items-center gap-2">
          <LuUsers className="size-4 shrink-0 text-[#C8A96E]" />
          {appWorkspace?._count.users ?? 0} usuarios asignados
        </span>
        <span className="flex items-center gap-2 text-xs text-zinc-500">
          <LuDatabase className="size-4 shrink-0" />
          {appWorkspace ? "Registrado en app" : "Solo en Typeform"}
        </span>
      </div>
    </article>
  );
}