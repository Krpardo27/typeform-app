import Link from "next/link";
import { LuArrowRight, LuFilePlus2, LuInbox } from "react-icons/lu";

type WorkspaceHomeActionsProps = {
  workspaceId: string;
  canCreateForms: boolean;
};

export function WorkspaceHomeActions({
  workspaceId,
  canCreateForms,
}: WorkspaceHomeActionsProps) {
  return (
    <section
      aria-label="Acciones del workspace"
      className="mt-6 grid min-w-0 gap-3 md:grid-cols-2"
    >
      {canCreateForms ? (
        <Link
          href={`/workspaces/${workspaceId}/forms/new`}
          className="flex min-w-0 items-center gap-3 group rounded-lg border border-[#E5E5E5] bg-white p-4 transition-colors hover:border-[#FF5C35]/50 hover:bg-[#FFFAF7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A33116] motion-reduce:transition-none sm:p-5"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#FFF1EB] text-[#FF5C35]">
            <LuFilePlus2 aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0 flex-1 wrap-anywhere">
            <h2 className="text-base font-semibold leading-6 text-[#171717]">
              Crear formulario
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#595954]">
              Duplica un formulario existente para crear uno nuevo.
            </p>
          </div>
          <LuArrowRight
            aria-hidden="true"
            className="size-4 shrink-0 translate-x-0 text-[#737373] transition-[color,translate] duration-300 ease-out group-hover:translate-x-1 group-hover:text-[#A33116] motion-reduce:translate-x-0 motion-reduce:transition-none"
          />
        </Link>
      ) : (
        <div className="flex min-w-0 items-center gap-3 rounded-lg border border-[#E5E5E5] bg-[#FAFAF9] p-4 sm:p-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#F0F0EE] text-[#737373]">
            <LuFilePlus2 aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0 flex-1 wrap-anywhere">
            <h2 className="text-base font-semibold leading-6 text-[#595954]">
              Crear formulario
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#595954]">
              No tienes permiso para crear formularios en esta radio.
            </p>
          </div>
        </div>
      )}

      <Link
        href={`/workspaces/${workspaceId}/forms`}
        className="group flex min-w-0 items-center gap-3 rounded-lg border border-[#E5E5E5] bg-white p-4 transition-colors hover:border-[#B8B8B2] hover:bg-[#FAFAF9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A33116] motion-reduce:transition-none sm:p-5"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#F5F5F3] text-[#595954]">
          <LuInbox aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0 flex-1 wrap-anywhere">
          <h2 className="text-base font-semibold leading-6 text-[#171717]">
            Formularios y respuestas
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#595954]">
            Selecciona un formulario para consultar sus respuestas.
          </p>
        </div>
        <LuArrowRight
          aria-hidden="true"
          className="size-4 shrink-0 translate-x-0 text-[#737373] transition-[color,translate] duration-300 ease-out group-hover:translate-x-1 group-hover:text-[#A33116] motion-reduce:translate-x-0 motion-reduce:transition-none"
        />
      </Link>
    </section>
  );
}
