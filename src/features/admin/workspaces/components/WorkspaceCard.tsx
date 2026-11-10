import Link from "next/link";
import Image from "next/image";
import { LuArrowUpRight, LuRadio, LuUsers } from "react-icons/lu";
import { templateFormOptions } from "../../../../../config/radio-workspaces";
import { getWorkspaceRadioLogo } from "../../../../../config/radio-logos";

type Props = {
  appWorkspace: {
    id: string;
    name: string;
    typeformId: string;
    templateFormTypeformId: string | null;
    _count: {
      users: number;
    };
  };
};

export function WorkspaceCard({ appWorkspace }: Props) {
  const userCount = appWorkspace._count.users;
  const radioLogo = getWorkspaceRadioLogo(appWorkspace);
  const templateId = appWorkspace.templateFormTypeformId?.trim() || null;
  const template = templateFormOptions.find(
    (option) => option.value === templateId,
  );
  const usersLabel =
    userCount === 0
      ? "Sin usuarios asignados"
      : `${userCount} ${userCount === 1 ? "usuario asignado" : "usuarios asignados"}`;

  return (
    <article className="h-full min-w-0">
      <Link
        href={`/admin/workspaces/${appWorkspace.typeformId}`}
        aria-label={`Abrir workspace ${appWorkspace.name}`}
        className="group flex h-full min-w-0 flex-col rounded-md border border-[#FF5C35]/30 bg-white p-4 text-[#171717] transition-colors hover:border-[#FF5C35] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#FF5C35] motion-reduce:transition-none sm:p-5"
      >
        <div className="min-w-0 pb-6">
          <div className="mb-3 flex size-20 items-center justify-center">
            {radioLogo ? (
              <Image
                src={radioLogo.src}
                alt={`Logo de ${radioLogo.name}`}
                width={80}
                height={80}
                sizes="80px"
                className="size-20 object-contain"
              />
            ) : (
              <LuRadio aria-hidden="true" className="size-7 text-[#737373]" />
            )}
          </div>
          <h2 className="text-base leading-snug font-semibold wrap-anywhere sm:text-lg">
            {appWorkspace.name}
          </h2>
          <dl className="mt-3 space-y-3 text-sm leading-5">
            <div className="flex flex-wrap gap-x-1.5 gap-y-1">
              <dt className="text-[#737373]">ID workspace</dt>
              <dd className="font-medium text-[#595954] tabular-nums wrap-anywhere">
                {appWorkspace.typeformId}
              </dd>
            </div>
            <div className="border-l-2 border-[#FF5C35]/40 pl-3">
              <dt className="text-[#595954]">Plantilla de origen</dt>
              <dd className="mt-1 text-[#171717]">
                {templateId ? (
                  <>
                    <span className="block font-medium wrap-anywhere">
                      {template?.label ?? "Formulario de Typeform"}
                    </span>
                    <span className="block text-[#595954] tabular-nums wrap-anywhere">
                      ID: {templateId}
                    </span>
                  </>
                ) : (
                  <span className="text-[#595954]">
                    Sin plantilla registrada
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-3 border-t border-[#E8E8E6] pt-4">
          <span className="flex items-center gap-2 text-sm leading-5 text-[#595954]">
            <LuUsers aria-hidden="true" className="size-4 shrink-0" />
            {usersLabel}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-[#A53318] underline-offset-4 group-hover:underline group-focus-visible:underline">
            Abrir
            <LuArrowUpRight aria-hidden="true" className="size-4" />
          </span>
        </div>
      </Link>
    </article>
  );
}
