"use client";

import { useRef, useState } from "react";
import { unstable_rethrow, useRouter } from "next/navigation";
import { LuTrash2, LuLoaderCircle } from "react-icons/lu";
import { deleteUserAction } from "../actions/delete-user-action";
import type { SweetAlertOptions } from "sweetalert2";
import { toast } from "sonner";

type Props = {
  userId: string;
  userName: string;
  disabled?: boolean;
};

const swalTheme = {
  background: "#FFFFFF",
  color: "#171717",
  buttonsStyling: false,
  customClass: {
    popup: "!rounded-lg !border !border-[#E5E5E5] !p-6",
    title: "!m-0 !p-0 !text-left !text-xl !font-semibold !leading-snug wrap-anywhere",
    htmlContainer: "!mx-0 !mb-0 !mt-3 !p-0 !text-left !text-sm !leading-6 !text-[#595954]",
    actions: "!mx-0 !mb-0 !mt-6 !w-full !justify-end gap-2",
    confirmButton: "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-[#B42318] bg-[#B42318] px-4 py-2 text-sm font-semibold text-white hover:bg-[#912018] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B42318] disabled:cursor-wait disabled:opacity-60",
    cancelButton: "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-[#D1D1CD] bg-white px-4 py-2 text-sm font-medium text-[#595954] hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171717] disabled:cursor-wait disabled:opacity-60",
    validationMessage: "!mx-0 !mt-4 !rounded-md !bg-[#FFF4F2] !text-sm !text-[#9B231B]",
  },
} satisfies SweetAlertOptions;

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export function DeleteUserButton({ userId, userName, disabled }: Props) {
  const router = useRouter();
  const busyRef = useRef(false);
  const [isBusy, setIsBusy] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const displayName = userName.trim() || "este usuario";

  async function handleDelete() {
    if (disabled || busyRef.current) return;
    busyRef.current = true;
    setIsBusy(true);

    try {
      const { default: Swal } = await import("sweetalert2");
      const result = await Swal.fire<boolean>({
        ...swalTheme,
        titleText: `¿Eliminar a ${displayName}?`,
        text: "Esta acción no se puede deshacer. También se eliminarán su autorización de acceso, sus sesiones y sus asignaciones a workspaces. Las radios y sus formularios se conservarán.",
        showCancelButton: true,
        focusCancel: true,
        reverseButtons: true,
        returnFocus: true,
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
        showLoaderOnConfirm: true,
        allowOutsideClick: () => !Swal.isLoading(),
        allowEscapeKey: () => !Swal.isLoading(),
        preConfirm: async () => {
          setIsDeleting(true);
          try {
            const response = await deleteUserAction(userId);

            if (!response || !("success" in response) || response.success !== true) {
              Swal.showValidationMessage(escapeHtml(response?.error || "No se pudo confirmar la eliminación. Actualiza la lista antes de volver a intentarlo."));
              return false;
            }

            return true;
          } catch (error) {
            unstable_rethrow(error);
            Swal.showValidationMessage("No pudimos confirmar la eliminación. Actualiza la lista antes de volver a intentarlo.");
            return false;
          } finally {
            setIsDeleting(false);
          }
        },
      });

      if (result.isConfirmed && result.value === true) {
        toast.success("Usuario eliminado", { description: `Se revocaron los accesos de ${displayName}.` });
        router.refresh();
      }
    } catch (error) {
      unstable_rethrow(error);
      toast.error("No se pudo completar la operación", {
        description: "Actualiza la lista para comprobar el estado del usuario antes de volver a intentarlo.",
      });
    } finally {
      busyRef.current = false;
      setIsBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={disabled || isBusy}
        aria-label={isDeleting ? `Eliminando a ${displayName}` : `Eliminar a ${displayName}`}
        aria-busy={isDeleting}
        title={disabled ? "No puedes eliminar tu propia cuenta" : "Eliminar usuario"}
        className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-[#D1D1CD] bg-white px-3 py-2 text-sm font-medium text-[#595954] transition-colors hover:border-[#DC2626]/40 hover:text-[#B42318] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B42318] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#D1D1CD] disabled:hover:text-[#595954] motion-reduce:transition-none"
      >
        {isDeleting ? (
          <LuLoaderCircle aria-hidden="true" className="size-3.5 shrink-0 animate-spin motion-reduce:animate-none" />
        ) : (
          <LuTrash2 aria-hidden="true" className="size-3.5 shrink-0" />
        )}
        {isDeleting ? "Eliminando…" : "Eliminar"}
      </button>
      <span role="status" className="sr-only">
        {isDeleting ? `Eliminando a ${displayName}.` : ""}
      </span>
    </div>
  );
}
