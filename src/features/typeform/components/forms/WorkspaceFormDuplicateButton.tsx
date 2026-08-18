"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { LuFilePlus2, LuLoaderCircle } from "react-icons/lu";
import { toast } from "sonner";
import { duplicateFormAction } from "@/features/typeform/actions/duplicate-form.action";
import { getSuggestedDuplicateTitle } from "@/features/typeform/utils/duplicate-title";
import { WORKSPACE_FORMS_GRID_LOADING_EVENT } from "./WorkspaceFormsGridLoadingGate";

type WorkspaceFormDuplicateButtonProps = {
  workspaceId: string;
  formId: string;
  formTitle: string;
};

export function WorkspaceFormDuplicateButton({
  workspaceId,
  formId,
  formTitle,
}: WorkspaceFormDuplicateButtonProps) {
  const router = useRouter();
  const isMountedRef = useRef(true);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  function setGridLoading(isLoading: boolean) {
    window.dispatchEvent(
      new CustomEvent(WORKSPACE_FORMS_GRID_LOADING_EVENT, {
        detail: { isLoading },
      }),
    );
  }

  async function handleDuplicate() {
    if (isPending) {
      return;
    }

    const suggestedTitle = getSuggestedDuplicateTitle(formTitle);

    const result = await Swal.fire<string>({
      title: "Duplicar formulario",
      text: "Puedes ajustar el nombre antes de crear la copia.",
      input: "text",
      inputValue: suggestedTitle,
      inputAttributes: {
        autocapitalize: "off",
        autocomplete: "off",
      },
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Duplicar",
      cancelButtonText: "Cancelar",
      background: "#FFFFFF",
      color: "#000000",
      confirmButtonColor: "#FF5C35",
      scrollbarPadding: false,
      heightAuto: false,
      inputValidator: (value) => {
        if (!value?.trim()) {
          return "Ingresa un nombre para el formulario duplicado.";
        }

        return undefined;
      },
    });

    if (!result.isConfirmed) {
      return;
    }

    const title = result.value?.trim() ?? "";

    if (!title) {
      toast.error("Ingresa un nombre para el formulario duplicado.");
      return;
    }

    const formData = new FormData();
    formData.set("title", title);
    formData.set("_skipRedirect", "1");

    setIsPending(true);
    setGridLoading(true);

    try {
      await duplicateFormAction(workspaceId, formId, formData);

      toast.success("Formulario duplicado", {
        description: `"${title}" se creó correctamente.`,
      });

      router.refresh();

      window.setTimeout(() => {
        setGridLoading(false);

        if (isMountedRef.current) {
          setIsPending(false);
        }
      }, 900);
    } catch {
      setGridLoading(false);

      if (isMountedRef.current) {
        setIsPending(false);
      }

      toast.error("No se pudo duplicar el formulario", {
        description: "Intenta nuevamente en unos segundos.",
      });
    }
  }

  return (
    <button
      type="button"
      onClick={handleDuplicate}
      disabled={isPending}
      title="Duplicar formulario"
      aria-label={`Duplicar ${formTitle}`}
      className="
        cursor-pointer
        flex size-11 shrink-0 items-center justify-center
        rounded-xl
        border border-[#FF5C35]/25
        bg-[#FFF4F0]
        text-[#FF5C35]
        transition-all
        hover:border-[#FF5C35]/45
        hover:bg-white
        hover:text-[#FF5C35]
        disabled:cursor-wait
        disabled:opacity-60
        sm:size-9
      "
    >
      {isPending ? (
        <LuLoaderCircle className="size-4 animate-spin" />
      ) : (
        <LuFilePlus2 className="size-4" />
      )}
    </button>
  );
}
