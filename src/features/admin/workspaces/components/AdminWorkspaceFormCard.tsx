import { LuArrowUpRight } from "react-icons/lu";
import type { TypeformFormSummary } from "@/features/typeform/services/typeform.service";
import { getFormDate, getFormVisibility, getWorkspaceFormUrl } from "../utils/workspace-view";

type Props = {
  form: TypeformFormSummary;
  workspaceTypeformId: string;
  templateFormTypeformId: string | null;
  appForm?: { description: string | null; createdAt: Date };
};

export function AdminWorkspaceFormCard({ form, workspaceTypeformId, templateFormTypeformId, appForm }: Props) {
  const title = form.title?.trim() || "Formulario sin título";
  const formUrl = getWorkspaceFormUrl(form, workspaceTypeformId, templateFormTypeformId);
  const updatedAt = getFormDate(form.last_updated_at);
  const registeredAt = getFormDate(appForm?.createdAt);

  return (
    <article className="flex h-full min-w-0 flex-col rounded-md border border-[#FF5C35]/30 bg-white p-5 text-[#171717] focus-within:border-[#FF5C35]">
      <h3 className="text-base leading-snug font-semibold wrap-anywhere">{title}</h3>
      {appForm?.description && <p className="mt-2 text-sm leading-5 text-[#595954] wrap-anywhere">{appForm.description}</p>}
      <p className="mt-3 text-sm leading-5 text-[#595954] tabular-nums wrap-anywhere">ID: {form.id}</p>

      <dl className="mt-5 space-y-2 text-sm leading-5 text-[#595954]">
        <div className="flex flex-wrap justify-between gap-x-3">
          <dt>Actualizado</dt>
          <dd>{updatedAt ? <time dateTime={updatedAt.dateTime}>{updatedAt.label}</time> : "Sin fecha informada"}</dd>
        </div>
        {registeredAt && (
          <div className="flex flex-wrap justify-between gap-x-3">
            <dt>Registrado en la app</dt>
            <dd><time dateTime={registeredAt.dateTime}>{registeredAt.label}</time></dd>
          </div>
        )}
      </dl>

      <div className="mt-auto pt-5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-[#E8E8E6] pt-3">
          <span className="text-sm leading-5 text-[#595954]">{getFormVisibility(form.settings?.is_public)}</span>
          {formUrl ? (
            <a
              href={formUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir ${title} en una nueva pestaña`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-sm text-sm font-medium text-[#A53318] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35]"
            >
              Abrir formulario
              <LuArrowUpRight aria-hidden="true" className="size-4 shrink-0" />
            </a>
          ) : <span className="text-sm leading-5 text-[#595954]">Enlace no disponible</span>}
        </div>
      </div>
    </article>
  );
}