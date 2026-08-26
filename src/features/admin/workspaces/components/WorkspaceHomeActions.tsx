import Link from "next/link";
import { LuFilePlus2, LuInbox } from "react-icons/lu";

type WorkspaceHomeActionsProps = {
  workspaceId: string;
  canCreateForms: boolean;
};

export function WorkspaceHomeActions({
  workspaceId,
  canCreateForms,
}: WorkspaceHomeActionsProps) {
  return (
    <section className="mt-8 grid gap-4 xl:grid-cols-3">
      {canCreateForms ? (
        <Link
          href={`/workspaces/${workspaceId}/forms/new`}
          className="cursor-pointer rounded-xl border border-[#FF5C35]/40 bg-[#FFFFFF] p-5 transition hover:border-[#FF5C35] hover:bg-[#F5F5F5]/40"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg border border-[#F5F5F5] bg-[#F5F5F5] text-[#FF5C35]">
              <LuFilePlus2 className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-[#000000]">
                Crear formulario
              </h2>
              <p className="mt-1 text-sm text-[#000000]/55">
                Crear mediante duplicación.
              </p>
            </div>
          </div>
        </Link>
      ) : (
        <div className="rounded-xl border border-[#F5F5F5] bg-[#FFFFFF] p-5 opacity-80">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg border border-[#F5F5F5] bg-[#F5F5F5] text-[#7C3AED]">
              <LuFilePlus2 className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-[#000000]">
                Crear formulario
              </h2>
              <p className="mt-1 text-sm text-[#000000]/55">
                Disponible solo para <span className="font-semibold text-[#000000] underline">editores</span> del workspace.
              </p>
            </div>
          </div>
        </div>
      )}

      <Link
        href={`/workspaces/${workspaceId}/forms`}
        className="rounded-xl border  bg-[#FFFFFF] p-5 transition border-[#7C3AED] hover:border-[#7C3AED]/40 hover:bg-[#F5F5F5]/40"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg border border-[#F5F5F5] bg-[#F5F5F5] text-[#7C3AED]">
            <LuInbox className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-[#000000]">Respuestas</h2>
            <p className="mt-1 text-sm text-[#000000]/55">
              Revisa respuestas por formulario desde la tabla principal.
            </p>
          </div>
        </div>
      </Link>
    </section>
  );
}