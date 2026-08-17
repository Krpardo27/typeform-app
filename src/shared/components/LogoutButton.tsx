"use client";

import { useState } from "react";
import { LuLoader, LuLogOut } from "react-icons/lu";
import { authClient } from "@/lib/auth-client";
import LoaderRedirect from "@/shared/ui/LoaderRedirect";

type LogoutButtonProps = {
  variant?: "default" | "dock" | "workspace-dock";
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
        description="Cerrando tu sesión..."
      />
    );
  }

  if (variant === "dock" || variant === "workspace-dock") {
    const isWorkspaceDock = variant === "workspace-dock";

    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={isPending}
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        className={
          isWorkspaceDock
            ? "group relative flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1 text-[9px] font-medium text-black/45 transition-colors duration-200 hover:text-[#FF5C35] disabled:cursor-not-allowed disabled:opacity-50 min-[390px]:text-[10px]"
            : "group relative flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1 text-[9px] font-medium text-zinc-400 transition-colors duration-200 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 min-[390px]:text-[10px]"
        }
      >
        <span className="flex size-7 items-center justify-center">
          {isPending ? (
            <LuLoader className="size-4 animate-spin" />
          ) : (
            <LuLogOut className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          )}
        </span>

        <span className="max-w-full truncate leading-none">
          {isPending ? "Saliendo" : "Salir"}
        </span>

        <span
          className={
            isWorkspaceDock
              ? "absolute bottom-1 left-1/2 h-0.5 w-0 -translate-x-1/2 rounded-full bg-[#FF5C35] opacity-0 transition-all duration-200 group-hover:w-4 group-hover:opacity-100"
              : "absolute bottom-1 left-1/2 h-0.5 w-0 -translate-x-1/2 rounded-full bg-[#C8A96E] opacity-0 transition-all duration-200 group-hover:w-4 group-hover:opacity-100"
          }
        />
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleLogout}
        disabled={isPending}
        className="group flex w-full cursor-pointer items-center gap-2.5 bg-[#FF5C35] px-3.5 py-2.5 text-left text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#f4512b] hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? (
          <LuLoader className="size-4 shrink-0 animate-spin" />
        ) : (
          <LuLogOut className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
        )}

        <span>{isPending ? "Cerrando sesión..." : "Cerrar sesión"}</span>
      </button>

      {error && <p className="px-3 text-xs leading-5 text-rose-500">{error}</p>}
    </div>
  );
}
