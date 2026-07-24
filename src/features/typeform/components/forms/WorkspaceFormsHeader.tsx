import Link from "next/link";
import { LuFilePlus2, LuFileText } from "react-icons/lu";
import { WorkspaceHeader } from "@/features/admin/workspaces/components/WorkspaceHeader";

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
    <WorkspaceHeader
      eyebrow={
        <>
          <LuFileText className="size-3.5 text-[#C8A96E]" />
          <span className="truncate">{workspaceName}</span>
        </>
      }
      title="Formularios"
      description="Formularios recuperados desde Typeform para este workspace."
      actions={
        <>
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
        </>
      }
    />
  );
}