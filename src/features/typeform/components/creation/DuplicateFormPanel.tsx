"use client";

import { useEffect, useRef, type SubmitEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LuFilePlus2, LuLoaderCircle } from "react-icons/lu";
import { toast } from "sonner";
import type { DuplicateFormResult } from "@/features/typeform/types/duplicate-form";
import DuplicateFormDialog from "../forms/DuplicateFormDialog";
import { useFormDuplication } from "../forms/useFormDuplication";

type DuplicateFormPanelProps = {
  action: (formData: FormData) => Promise<DuplicateFormResult>;
  recoverAction: (createdFormId: string) => Promise<DuplicateFormResult>;
  recoveryKey: string;
  defaultTitle: string;
  redirectTo: string;
  clonedFrom?: string;
};

export function DuplicateFormPanel({
  action,
  recoverAction,
  recoveryKey,
  defaultTitle,
  redirectTo,
  clonedFrom,
}: DuplicateFormPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const { duplicate, isPending, dialogProps } = useFormDuplication({
    suggestedTitle: defaultTitle,
    redirectTo,
    recoveryKey,
    create: (title, allowSameTitle) => {
      const data = new FormData();
      data.set("title", title);
      data.set("_skipRedirect", "1");
      if (allowSameTitle) data.set("_allowSameTitle", "1");
      return action(data);
    },
    recover: recoverAction,
  });

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

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending) {
      return;
    }

    const form = formRef.current;

    if (!form) {
      return;
    }

    const titleInput = form.elements.namedItem(
      "title",
    ) as HTMLInputElement | null;

    const title = titleInput?.value?.trim() ?? "";

    if (!title) {
      toast.error("Ingresa un nombre para el formulario duplicado.");
      titleInput?.focus();
      return;
    }

    void duplicate(title);
  }

  return (
    <>
    <section
      aria-busy={isPending}
      className="mt-6 rounded-md border border-[#FF5C35]/35 bg-white p-5 text-[#171717] sm:p-6"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-[#595954]">
        <LuFilePlus2 aria-hidden="true" className="size-4 text-[#A53318]" />
        <span>Duplicación</span>
      </div>

      <h2 className="mt-2 text-base font-semibold text-[#111111]">
        Crear nuevo formulario desde esta base
      </h2>

      <p className="mt-2 text-sm leading-6 text-[#595954]">
        Cambia el nombre y luego guárdalo para crear el duplicado. El formulario
        actual no se modifica.
      </p>

      <form
        ref={formRef}
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
            readOnly={isPending}
            className="min-h-12 w-full rounded-md border border-[#FF5C35]/35 bg-white px-3 py-3 text-base text-[#171717] outline-none focus:border-[#FF5C35] focus:outline-2 focus:outline-offset-2 focus:outline-[#FF5C35] read-only:cursor-wait read-only:opacity-70"
          />

          <p className="mt-2 text-sm leading-5 text-[#595954]">
            Este nombre se aplicará al nuevo formulario al presionar{" "}
            <span className="font-medium text-white">
              Guardar y duplicar
            </span>
            .
          </p>
        </label>

        <button
          type="submit"
          disabled={isPending}
          aria-haspopup="dialog"
          className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md bg-[#FF5C35] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#F4512B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171717] disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
        >
          {isPending ? (
            <>
              <LuLoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
              Procesando…
            </>
          ) : (
            <>
              <LuFilePlus2 aria-hidden="true" className="size-4" />
              Guardar y duplicar
            </>
          )}
        </button>
      </form>
    </section>
    {dialogProps && <DuplicateFormDialog {...dialogProps} />}
    </>
  );
}
