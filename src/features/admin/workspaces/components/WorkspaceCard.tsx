import Link from "next/link";
import { LuArrowUpRight, LuUsers } from "react-icons/lu";

type Props = {
  workspace: {
    id: string;
    name: string;
    typeformId: string;
    _count: {
      users: number;
    };
  };
};

export function WorkspaceCard({ workspace }: Props) {
  return (
    <article className="rounded-xl border border-zinc-800 bg-[#111113] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-white">
            {workspace.name}
          </h2>

          <p className="mt-1 truncate text-xs text-zinc-500">
            Typeform workspace ID: {workspace.typeformId}
          </p>
        </div>

        <Link
          href={`/admin/workspaces/${workspace.typeformId}`}
          className="rounded-lg border border-zinc-800 p-2 text-zinc-400 transition hover:border-[#C8A96E] hover:text-[#C8A96E]"
        >
          <LuArrowUpRight className="size-4" />
        </Link>
      </div>

      <div className="mt-5 flex items-center gap-2 text-sm text-zinc-400">
        <LuUsers className="size-4 text-[#C8A96E]" />
        <span>{workspace._count.users} usuarios asignados</span>
      </div>
    </article>
  );
}
