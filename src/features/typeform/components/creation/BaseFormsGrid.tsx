import { WorkspaceFormDuplicateButton } from "../forms/WorkspaceFormDuplicateButton";

type BaseForm = {
  id: string;
  title: string;
};

type Props = {
  workspaceId: string;
  forms: BaseForm[];
};

export function BaseFormsGrid({ workspaceId, forms }: Props) {
  if (forms.length === 0) {
    return (
      <section aria-label="Formularios base disponibles" className="mt-8 rounded-md border border-[#FF5C35]/30 bg-white p-5">
        <h2 className="text-base font-medium text-[#171717]">No hay formularios base disponibles</h2>
        <p className="mt-2 text-sm leading-6 text-[#595954]">Cuando haya formularios disponibles en este workspace, podrás elegir uno para crear una copia.</p>
      </section>
    );
  }

  return (
    <section aria-label="Formularios base disponibles" className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {forms.map((form) => (
        <article
          key={form.id}
          className="flex h-full min-h-44 min-w-0 flex-col rounded-md border border-[#FF5C35]/30 bg-white p-4 text-[#171717] transition-colors hover:border-[#FF5C35]/70 focus-within:border-[#FF5C35] motion-reduce:transition-none sm:p-5"
        >
          <div className="min-w-0">
            <h2 className="text-base leading-snug font-semibold wrap-anywhere">
              {form.title.trim() || "Formulario sin título"}
            </h2>

            <p className="mt-2 text-sm leading-5 text-[#595954] tabular-nums wrap-anywhere">
              ID: {form.id}
            </p>
          </div>

          <div className="mt-auto pt-5">
            <div className="border-t border-[#E8E8E6] pt-3">
              <WorkspaceFormDuplicateButton
                workspaceId={workspaceId}
                formId={form.id}
                formTitle={form.title.trim() || "Formulario sin título"}
                label="Usar como base"
              />
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
