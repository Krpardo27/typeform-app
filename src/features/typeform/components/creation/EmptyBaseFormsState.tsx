import { CreateDefaultFormButton } from "./CreateDefaultFormButton";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
};

export function EmptyBaseFormsState({ action }: Props) {
  return (
    <section className="mt-8 rounded-xl border border-[#F5F5F5] bg-[#FFFFFF] p-5 sm:p-6">
      <h2 className="text-base font-semibold text-[#000000]">
        Sin formularios base
      </h2>
      <p className="mt-1 max-w-xl text-sm text-[#000000]/55">
        Este workspace no tiene formularios disponibles para duplicar.
      </p>

      <CreateDefaultFormButton action={action} />
    </section>
  );
}