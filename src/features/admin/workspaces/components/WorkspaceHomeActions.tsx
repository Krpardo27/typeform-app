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
          className="rounded-xl border border-[#C8A96E]/50 bg-[#111113] p-5 transition hover:border-[#C8A96E]"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-[#C8A96E]">
              <LuFilePlus2 className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-white">
                Crear formulario
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Crear mediante duplicacion.
              </p>
            </div>
          </div>
        </Link>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-[#111113] p-5 opacity-75">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-[#C8A96E]">
              <LuFilePlus2 className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-white">
                Crear formulario
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Disponible solo para editores del workspace.
              </p>
            </div>
          </div>
        </div>
      )}

      <Link
        href={`/workspaces/${workspaceId}/forms`}
        className="rounded-xl border border-zinc-800 bg-[#111113] p-5 transition hover:border-[#C8A96E]/50"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-[#C8A96E]">
            <LuInbox className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-white">Respuestas</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Revisa respuestas por formulario desde la tabla principal.
            </p>
          </div>
        </div>
      </Link>
    </section>
  );
}