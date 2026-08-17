"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Swal from "sweetalert2";
import { LuFilePlus2 } from "react-icons/lu";
import { toast } from "sonner";

type DuplicateFormPanelProps = {
  action: (formData: FormData) => void | Promise<void>;
  defaultTitle: string;
  clonedFrom?: string;
};

export function DuplicateFormPanel({
  action,
  defaultTitle,
  clonedFrom,
}: DuplicateFormPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const submitConfirmedRef = useRef(false);

  useEffect(() => {
    if (!clonedFrom) {
      return;
    }

    const toastKey = `duplicated-form-toast:${pathname}:${clonedFrom}`;

    if (sessionStorage.getItem(toastKey) === "1") {
      return;
    }

    sessionStorage.setItem(toastKey, "1");

    toast.success("Formulario duplicado", {
      description:
        "El formulario se clonó correctamente desde la base seleccionada.",
    });

    const params = new URLSearchParams(searchParams.toString());
    params.delete("clonedFrom");

    const nextQuery = params.toString();

    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  }, [clonedFrom, pathname, router, searchParams]);

  const handleSubmit: NonNullable<
    React.ComponentProps<"form">["onSubmit"]
  > = async (event) => {
    if (submitConfirmedRef.current) {
      submitConfirmedRef.current = false;
      return;
    }

    event.preventDefault();

    const form = formRef.current;

    if (!form) {
      return;
    }

    const titleInput = form.elements.namedItem(
      "title",
    ) as HTMLInputElement | null;

    const title = titleInput?.value?.trim() ?? "";

    const result = await Swal.fire({
      title: "Guardar y duplicar formulario",
      text: title
        ? `Se creará una copia llamada "${title}".`
        : "Se creará una copia del formulario base.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, guardar y duplicar",
      cancelButtonText: "Cancelar",
      background: "#FFFFFF",
      color: "#000000",
      confirmButtonColor: "#FF5C35",
      scrollbarPadding: false,
      heightAuto: false,
    });

    if (!result.isConfirmed) {
      return;
    }

    submitConfirmedRef.current = true;
    form.requestSubmit();
  };

  return (
    <section
      className="
        mt-6
        rounded-2xl
        border border-[#E8E8E6]
        bg-white
        p-5
        shadow-[0_8px_30px_-18px_rgba(0,0,0,0.18)]
      "
    >
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#000000]/45">
        <LuFilePlus2 className="size-3.5 text-[#FF5C35]" />
        <span>Duplicación</span>
      </div>

      <h2 className="mt-2 text-base font-semibold text-[#111111]">
        Crear nuevo formulario desde esta base
      </h2>

      <p className="mt-1 text-sm leading-6 text-[#000000]/55">
        Cambia el nombre y luego guárdalo para crear el duplicado. El formulario
        actual no se modifica.
      </p>

      <form
        ref={formRef}
        action={action}
        onSubmit={handleSubmit}
        className="mt-5 flex flex-col gap-3 md:flex-row md:items-start"
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">Nombre del nuevo formulario</span>

          <input
            name="title"
            type="text"
            required
            defaultValue={defaultTitle}
            className="
              w-full
              rounded-xl
              border border-[#E8E8E6]
              bg-[#FAFAF9]
              px-3 py-2.5
              text-sm text-[#111111]
              outline-none
              transition-all
              placeholder:text-[#000000]/40
              focus:border-[#FF5C35]
              focus:bg-white
              focus:ring-2
              focus:ring-[#FF5C35]/10
            "
          />

          <p className="mt-1.5 text-xs text-[#000000]/50">
            Este nombre se aplicará al nuevo formulario al presionar{" "}
            <span className="font-medium text-[#000000]/65">
              Guardar y duplicar
            </span>
            .
          </p>
        </label>

        <button
          type="submit"
          className="
            inline-flex
            items-center
            justify-center
            gap-2
            rounded-xl
            bg-[#FF5C35]
            px-4 py-2.5
            text-sm font-semibold
            text-white
            shadow-[0_4px_12px_-4px_rgba(255,92,53,0.4)]
            transition-all
            hover:-translate-y-0.5
            hover:opacity-90
            active:translate-y-0
          "
        >
          <LuFilePlus2 className="size-4" />
          Guardar y duplicar
        </button>
      </form>
    </section>
  );
}