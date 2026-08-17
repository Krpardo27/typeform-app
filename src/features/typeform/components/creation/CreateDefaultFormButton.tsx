"use client";

import { useRef } from "react";
import Swal from "sweetalert2";
import { LuFilePlus2 } from "react-icons/lu";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
};

export function CreateDefaultFormButton({ action }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const submitConfirmedRef = useRef(false);

  const handleSubmit: NonNullable<React.ComponentProps<"form">["onSubmit"]> =
    async (event) => {
      if (submitConfirmedRef.current) {
        submitConfirmedRef.current = false;
        return;
      }

      event.preventDefault();

      const result = await Swal.fire({
        title: "Crear formulario base",
        text: "Se creara un formulario base en este workspace.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Si, crear",
        cancelButtonText: "Cancelar",
        background: "#FFFFFF",
        color: "#000000",
        confirmButtonColor: "#FF5C35",
      });

      if (!result.isConfirmed) {
        return;
      }

      submitConfirmedRef.current = true;
      formRef.current?.requestSubmit();
    };

  return (
    <form ref={formRef} action={action} onSubmit={handleSubmit} className="mt-5">
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#FF5C35] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
      >
        <LuFilePlus2 className="size-4" />
        Crear formulario base ahora
      </button>
    </form>
  );
}