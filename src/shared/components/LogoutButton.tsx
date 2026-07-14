"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LuLoader, LuLogOut } from "react-icons/lu";
import { authClient } from "@/lib/auth-client";
import { AppLoader } from "@/shared/components/AppLoader";
import { useMinDuration } from "@/shared/hooks/useMinDuration";

type LogoutButtonProps = {
  variant?: "default" | "dock";
};

export function LogoutButton({ variant = "default" }: LogoutButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showLoader = useMinDuration(isPending, 1200);

  async function handleLogout() {
    setIsPending(true);
    setError(null);

    const { error } = await authClient.signOut();

    if (error) {
      setError(error.message ?? "No se pudo cerrar la sesion");
      setIsPending(false);
      return;
    }

    setTimeout(() => {
      router.replace("/auth/login");
      router.refresh();
    }, 1200);
  }

  if (variant === "dock") {
    return (
      <>
        <AppLoader
          isOpen={showLoader}
          title="Cerrando sesion"
          description="Estamos eliminando tu token de sesion y limpiando el acceso de este navegador."
        />

        <button
          type="button"
          onClick={handleLogout}
          disabled={isPending}
          aria-label="Cerrar sesion"
          title="Cerrar sesion"
          className="group relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 py-1 text-[9px] font-medium text-zinc-400 transition-colors hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50 min-[390px]:text-[10px]"
        >
          {isPending ? (
            <LuLoader className="h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <LuLogOut className="h-4 w-4 shrink-0" />
          )}
          <span className="max-w-full truncate leading-none">
            {isPending ? "Saliendo" : "Salir"}
          </span>
        </button>
      </>
    );
  }

  return (
    <div className="space-y-2">
      <AppLoader
        isOpen={showLoader}
        title="Cerrando sesion"
        description="Estamos eliminando tu token de sesion y limpiando el acceso de este navegador."
      />

      <button
        type="button"
        onClick={handleLogout}
        disabled={isPending}
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-left text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        {isPending ? "Cerrando sesion..." : "Cerrar sesion"}
      </button>
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
