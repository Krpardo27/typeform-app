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
          <LuFileText aria-hidden="true" className="size-3.5 shrink-0 text-[#FF5C35]" />
          <span className="min-w-0 wrap-anywhere">{workspaceName}</span>
        </>
      }
      title="Formularios"
      actions={
        <>
          <p className="rounded-lg border border-[#F5F5F5] bg-[#FFFFFF] px-3 py-2 text-sm text-[#000000]/65">
            {totalItems} Formularios
          </p>

          {canCreateForms ? (
            <Link
              href={`/workspaces/${workspaceId}/forms/new`}
              className="inline-flex items-center gap-2 rounded-lg bg-[#FF5C35] px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <LuFilePlus2 className="size-4" />
              Crear
            </Link>
          ) : (
            <span className="rounded-lg border border-[#F5F5F5] bg-[#FFFFFF] px-3 py-2 text-sm text-[#000000]/45">
              Solo lectura
            </span>
          )}
        </>
      }
    />
  );
}
