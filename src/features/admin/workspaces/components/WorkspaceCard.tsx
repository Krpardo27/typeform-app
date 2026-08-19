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
    <article className="group rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] p-4 shadow-sm transition hover:border-[#18181B]/20 hover:shadow-[#18181B]/5 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="line-clamp-2 wrap-break-word text-base font-semibold leading-snug text-[#171717] sm:truncate sm:text-lg">
            {workspaceName}
          </h2>
          <p className="mt-1 truncate text-[11px] text-[#737373] sm:text-xs">
            ID workspace: {typeformWorkspace.id}
          </p>
        </div>
        <Link
          href={`/admin/workspaces/${typeformWorkspace.id}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[#E5E5E5] bg-[#F5F5F5] text-[#737373] transition group-hover:border-[#18181B]/30 group-hover:text-[#18181B] hover:scale-[1.02] sm:size-9"
        >
          <LuArrowUpRight className="size-4" />
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[#171717] sm:mt-5">
          <span className="flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-[#F5F5F5] px-2.5 py-1">
            <LuUsers className="size-4 shrink-0 text-[#18181B]" />
          {appWorkspace?._count.users ?? 0} usuarios asignados
        </span>

        <span
          className={`flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs ${
            isRegisteredInApp
              ? "border-[#16A34A]/30 bg-[#16A34A]/10 text-[#16A34A]"
              : "border-[#E5E5E5] bg-[#F5F5F5] text-[#737373]"
          }`}
        >
          <LuDatabase className="size-4 shrink-0" />
          {isRegisteredInApp ? "Registrado en app" : "Solo en Typeform"}
        </span>
      </div>
    </article>
  );
}