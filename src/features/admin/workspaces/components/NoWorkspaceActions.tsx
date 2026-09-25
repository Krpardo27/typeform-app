"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LuArrowRight, LuLoader, LuLogOut, LuRefreshCw } from "react-icons/lu";
import { authClient } from "@/lib/auth-client";
import LoaderRedirect from "@/shared/ui/LoaderRedirect";

export function NoWorkspaceActions() {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  async function handleChangeAccount() {
    setIsSigningOut(true);
    setError(null);

    const { error } = await authClient.signOut();

    if (error) {
      setError(error.message ?? "No se pudo cerrar la sesion");
      setIsSigningOut(false);
      return;
    }

    setRedirecting(true);
  }

  if (redirecting) {
    return (
      <LoaderRedirect
        redirectTo="/auth/login"
        title="Cambiando de cuenta"
        description="Cerrando tu sesion actual..."
      />
    );
  }

  return (
    <div className="mt-8 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => startRefresh(() => router.refresh())}
          disabled={isRefreshing || isSigningOut}
          className="group flex min-h-24 cursor-pointer items-start justify-between gap-4 rounded-2xl border border-[#E5E5E5] bg-[#F8F8F7] p-4 text-left transition hover:border-[#18181B]/20 hover:bg-[#FFFFFF] hover:shadow-[0_14px_35px_rgba(23,23,23,0.08)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex min-w-0 flex-col">
            <span className="flex items-center gap-2 text-sm font-semibold text-[#171717]">
              {isRefreshing ? (
                <LuLoader className="size-4 animate-spin text-[#7C3AED]" />
              ) : (
                <LuRefreshCw className="size-4 text-[#7C3AED]" />
              )}
              {isRefreshing ? "Actualizando" : "Actualizar acceso"}
            </span>
            <span className="mt-2 text-xs leading-5 text-[#737373]">
              Vuelve a consultar tus permisos sin cerrar esta sesion.
            </span>
          </span>
          <LuArrowRight className="mt-0.5 size-4 shrink-0 text-[#A3A3A3] transition group-hover:translate-x-0.5 group-hover:text-[#171717]" />
        </button>

        <button
          type="button"
          onClick={handleChangeAccount}
          disabled={isRefreshing || isSigningOut}
          className="group flex min-h-24 cursor-pointer items-start justify-between gap-4 rounded-2xl border border-[#FFD9CF] bg-[#FFF7F4] p-4 text-left transition hover:border-[#FF5C35]/35 hover:bg-[#FFFFFF] hover:shadow-[0_14px_35px_rgba(255,92,53,0.12)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex min-w-0 flex-col">
            <span className="flex items-center gap-2 text-sm font-semibold text-[#171717]">
              {isSigningOut ? (
                <LuLoader className="size-4 animate-spin text-[#FF5C35]" />
              ) : (
                <LuLogOut className="size-4 text-[#FF5C35]" />
              )}
              {isSigningOut ? "Saliendo" : "Cambiar de cuenta"}
            </span>
            <span className="mt-2 text-xs leading-5 text-[#737373]">
              Cierra esta sesion y abre el login para usar otro correo.
            </span>
          </span>
          <LuArrowRight className="mt-0.5 size-4 shrink-0 text-[#FF8B70] transition group-hover:translate-x-0.5 group-hover:text-[#FF5C35]" />
        </button>
      </div>

      {error && <p className="text-xs text-[#C2412D]">{error}</p>}
    </div>
  );
}