"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LuTrash2, LuLoaderCircle } from "react-icons/lu";
import { deleteUserAction } from "../actions/delete-user-action";
import Swal from "sweetalert2";

type Props = {
  userId: string;
  userName: string;
  disabled?: boolean;
};

const swalTheme = {
  background: "#111113",
  color: "#f4f4f5",
  confirmButtonColor: "#ef4444",
  cancelButtonColor: "#3f3f46",
};

export function DeleteUserButton({ userId, userName, disabled }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleDelete() {
    const result = await Swal.fire({
      title: `Eliminar a "${userName}"`,
      text: "Esta accion no se puede deshacer. Tambien se eliminaran sus sesiones y accesos a workspaces.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Si, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: swalTheme.confirmButtonColor,
      cancelButtonColor: swalTheme.cancelButtonColor,
      background: swalTheme.background,
      color: swalTheme.color,
    });

    if (!result.isConfirmed) return;

    startTransition(async () => {
      const response = await deleteUserAction(userId);

      if (response?.error) {
        await Swal.fire({
          title: "No se pudo eliminar",
          text: response.error,
          icon: "error",
          confirmButtonText: "Entendido",
          confirmButtonColor: swalTheme.confirmButtonColor,
          background: swalTheme.background,
          color: swalTheme.color,
        });
        return;
      }

      router.refresh();

      await Swal.fire({
        title: "Usuario eliminado",
        icon: "success",
        confirmButtonText: "Listo",
        confirmButtonColor: "#10b981",
        background: swalTheme.background,
        color: swalTheme.color,
        timer: 1800,
        timerProgressBar: true,
      });
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={disabled || isPending}
        title={disabled ? "No puedes eliminar tu propia cuenta" : "Eliminar usuario"}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-red-500/50 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-zinc-800 disabled:hover:text-zinc-400"
      >
        {isPending ? (
          <LuLoaderCircle className="size-3.5 animate-spin" />
        ) : (
          <LuTrash2 className="size-3.5" />
        )}
        Eliminar
      </button>
    </div>
  );
}
