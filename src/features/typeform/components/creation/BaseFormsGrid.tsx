import Link from "next/link";
import { FiChevronRight } from "react-icons/fi";

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
    <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {forms.map((form) => (
        <Link
          key={form.id}
          href={`/workspaces/${workspaceId}/forms/${form.id}`}
          className="
            group
            flex min-h-[180px]
            flex-col justify-between
            overflow-hidden
            rounded-2xl
            border border-[#E8E8E6]
            bg-white
            p-4
            shadow-[0_8px_30px_-18px_rgba(0,0,0,0.18)]
            transition-all
            duration-200
            ease-out
            hover:-translate-y-0.5
            hover:border-[#FF5C35]/40
            hover:shadow-[0_14px_35px_-18px_rgba(0,0,0,0.22)]
            sm:p-5
          "
        >
          <div className="min-w-0">
            <h2
              className="
                line-clamp-2
                text-base
                font-semibold
                leading-snug
                text-[#111111]
                transition-colors
                group-hover:text-[#FF5C35]
              "
            >
              {form.title}
            </h2>

            <p className="mt-2 break-all text-xs text-[#000000]/55">
              ID: {form.id}
            </p>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-[#E8E8E6] pt-3">
            <span className="text-sm font-medium text-[#FF5C35]">
              Usar como base
            </span>

            <span
              className="
                flex size-8 items-center justify-center
                rounded-full
                bg-[#FFF3EE]
                text-lg
                text-[#FF5C35]
                transition-all
                group-hover:bg-[#FF5C35]
                group-hover:text-white
              "
            >
              <FiChevronRight />
            </span>
          </div>
        </Link>
      ))}
    </section>
  );
}