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
      description: "El formulario se clono correctamente desde la base seleccionada.",
    });

    const params = new URLSearchParams(searchParams.toString());
    params.delete("clonedFrom");
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  }, [clonedFrom, pathname, router, searchParams]);

  const handleSubmit: NonNullable<React.ComponentProps<"form">["onSubmit"]> =
    async (event) => {
      if (submitConfirmedRef.current) {
        submitConfirmedRef.current = false;
        return;
      }

      event.preventDefault();

      const form = formRef.current;

      if (!form) {
        return;
      }

      const titleInput = form.elements.namedItem("title") as HTMLInputElement | null;
      const title = titleInput?.value?.trim() ?? "";

      const result = await Swal.fire({
        title: "Guardar y duplicar formulario",
        text: title
          ? `Se creará una copia llamada \"${title}\".`
          : "Se creará una copia del formulario base.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Si, guardar y duplicar",
        cancelButtonText: "Cancelar",
        background: "#111113",
        color: "#f4f4f5",
        confirmButtonColor: "#C8A96E",
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
    <section className="mt-6 rounded-xl border border-zinc-800 bg-[#111113] p-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
        <LuFilePlus2 className="size-3.5 text-[#C8A96E]" />
        <span>Duplicación</span>
      </div>

      <h2 className="mt-2 text-base font-semibold text-white">
        Crear nuevo formulario desde esta base
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        Cambia el nombre y luego guárdalo para crear el duplicado. El formulario actual no se modifica.
      </p>

      <form
        ref={formRef}
        action={action}
        onSubmit={handleSubmit}
        className="mt-5 flex flex-col gap-3 md:flex-row"
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">Nombre del nuevo formulario</span>
          <input
            name="title"
            type="text"
            required
            defaultValue={defaultTitle}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#C8A96E]"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Este nombre se aplicará al nuevo formulario al presionar Guardar y duplicar.
          </p>
        </label>

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#C8A96E] px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-[#d7b87b]"
        >
          <LuFilePlus2 className="size-4" />
          Guardar y duplicar
        </button>
      </form>
    </section>
  );
}
