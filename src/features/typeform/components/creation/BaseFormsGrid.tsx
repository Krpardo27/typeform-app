import Link from "next/link";

type BaseForm = {
  id: string;
  title: string;
};

type Props = {
  workspaceId: string;
  forms: BaseForm[];
};

export function BaseFormsGrid({ workspaceId, forms }: Props) {
  return (
    <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {forms.map((form) => (
        <Link
          key={form.id}
          href={`/workspaces/${workspaceId}/forms/${form.id}`}
          className="group flex min-h-32 flex-col justify-between rounded-xl border border-zinc-800 bg-[#111113] p-4 transition hover:border-[#C8A96E]/50 sm:p-5"
        >
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-base font-semibold text-white transition group-hover:text-[#C8A96E]">
              {form.title}
            </h2>
            <p className="mt-2 break-all text-xs text-zinc-500">ID: {form.id}</p>
          </div>

          <p className="mt-4 text-sm font-medium text-[#C8A96E]">
            Usar como base
          </p>
        </Link>
      ))}
    </section>
  );
}