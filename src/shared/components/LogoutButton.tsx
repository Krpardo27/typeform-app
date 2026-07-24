"use client";

import { useState } from "react";
import { LuLoader, LuLogOut } from "react-icons/lu";
import { authClient } from "@/lib/auth-client";
import LoaderRedirect from "@/shared/ui/LoaderRedirect";

type LogoutButtonProps = {
  variant?: "default" | "dock";
};

export function LogoutButton({ variant = "default" }: LogoutButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  async function handleLogout() {
    setIsPending(true);
    setError(null);

    const { error } = await authClient.signOut();

    if (error) {
      setError(error.message ?? "No se pudo cerrar la sesión");
      setIsPending(false);
      return;
    }

    setRedirecting(true);
  }

  if (redirecting) {
    return (
      <LoaderRedirect
        redirectTo="/auth/login"
        title="Hasta pronto"
        description="Cerrando tu sesión de forma segura."
      />
    );
  }

  if (variant === "dock") {
    return (
      <>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isPending}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
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
      <button
        type="button"
        onClick={handleLogout}
        disabled={isPending}
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-left text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        {isPending ? "Cerrando sesión..." : "Cerrar sesión"}
      </button>
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
