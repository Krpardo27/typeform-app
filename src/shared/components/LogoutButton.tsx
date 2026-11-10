"use client";

import { useState } from "react";
import { LuLoader, LuLogOut } from "react-icons/lu";
import { authClient } from "@/lib/auth-client";
import LoaderRedirect from "@/shared/ui/LoaderRedirect";

type LogoutButtonProps = {
  variant?: "default" | "dock" | "workspace-dock" | "admin";
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
        variant="logout"
        title="Hasta pronto"
        description="Puedes volver a entrar cuando lo necesites."
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
        aria-busy={isPending}
        title="Cerrar sesión"
        className={`flex h-full min-h-16 min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg px-0.5 py-1 font-medium leading-4 text-[#595954] transition-colors hover:bg-[#F5F5F5] hover:text-[#A33116] focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#A33116] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${isWorkspaceDock ? "text-sm min-[390px]:text-sm" : "text-[10px] min-[390px]:text-xs"}`}
      >
        <span className="flex size-8 items-center justify-center">
          {isPending ? (
            <LuLoader
              aria-hidden="true"
              className="size-5 animate-spin motion-reduce:animate-none"
            />
          ) : (
            <LuLogOut aria-hidden="true" className="size-5" />
          )}
        </span>

        <span
          className={`max-w-full text-center ${isWorkspaceDock ? "text-sm" : "tracking-tight"}`}
        >
          {isPending ? "Saliendo" : "Salir"}
        </span>
      </button>
    );
  }

  if (variant === "admin") {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleLogout}
          disabled={isPending}
          className="group flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-[#E5E5E5] bg-[#F5F5F5] px-3.5 py-2.5 text-left text-sm font-medium text-[#171717] transition-all duration-200 hover:bg-[#27272A] hover:text-white active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <LuLoader className="size-5 shrink-0 animate-spin" />
          ) : (
            <LuLogOut className="size-5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
          )}
          <span>{isPending ? "Cerrando sesión..." : "Cerrar sesión"}</span>
        </button>
        {error && (
          <p className="px-3 text-sm leading-5 text-[#DC2626]">{error}</p>
        )}
      </div>
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
          <LuLoader className="size-5 shrink-0 animate-spin" />
        ) : (
          <LuLogOut className="size-5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
        )}

        <span>{isPending ? "Cerrando sesión..." : "Cerrar sesión"}</span>
      </button>

      {error && <p className="px-3 text-sm leading-5 text-rose-500">{error}</p>}
    </div>
  );
}
