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
    <article className="rounded-xl border border-zinc-800 bg-[#111113] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-white">
            {workspaceName}
          </h2>

          <p className="mt-1 truncate text-xs text-zinc-500">
            Typeform workspace ID: {typeformWorkspace.id}
          </p>
        </div>

        <Link
          href={`/admin/workspaces/${typeformWorkspace.id}`}
          className="rounded-lg border border-zinc-800 p-2 text-zinc-400 transition hover:border-[#C8A96E] hover:text-[#C8A96E]"
        >
          <LuArrowUpRight className="size-4" />
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
        <span className="flex items-center gap-2">
          <LuUsers className="size-4 text-[#C8A96E]" />
          {appWorkspace?._count.users ?? 0} usuarios asignados
        </span>

        <span className="flex items-center gap-2 text-xs text-zinc-500">
          <LuDatabase className="size-4" />
          {appWorkspace ? "Registrado en app" : "Solo en Typeform"}
        </span>
      </div>
    </article>
  );
}
