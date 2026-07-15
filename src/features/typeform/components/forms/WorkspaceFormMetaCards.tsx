import { CopyButton } from "@/shared/components/CopyButton";

type WorkspaceFormMetaCardsProps = {
  formId: string;
  fieldsCount: number;
  hiddenFieldsCount: number;
  clonedFrom?: string;
};

export function WorkspaceFormMetaCards({
  formId,
  fieldsCount,
  hiddenFieldsCount,
  clonedFrom,
}: WorkspaceFormMetaCardsProps) {
  const idLabel = clonedFrom
    ? "Typeform ID del duplicado"
    : "Typeform ID del formulario base";

  return (
    <section className="mt-8 grid gap-4 lg:grid-cols-3">
      <article className="rounded-xl border border-zinc-800 bg-[#111113] p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {idLabel}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
          <code className="truncate text-sm text-zinc-200">{formId}</code>
          <CopyButton value={formId} label="Copiar" />
        </div>
        {clonedFrom && (
          <p className="mt-2 text-xs text-zinc-500">Base original: {clonedFrom}</p>
        )}
      </article>

      <article className="rounded-xl border border-zinc-800 bg-[#111113] p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Campos
        </p>
        <p className="mt-3 text-2xl font-bold text-white">{fieldsCount}</p>
      </article>

      <article className="rounded-xl border border-zinc-800 bg-[#111113] p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Hidden fields
        </p>
        <p className="mt-3 text-2xl font-bold text-white">{hiddenFieldsCount}</p>
      </article>
    </section>
  );
}
