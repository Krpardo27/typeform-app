"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AppLoader } from "@/shared/components/AppLoader";
import { useMinDuration } from "@/shared/hooks/useMinDuration";

export function LogoutButton() {
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
