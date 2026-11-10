"use client";

import { useEffect, useRef, useState } from "react";
import { LuDownload, LuLoader } from "react-icons/lu";
import { toast } from "sonner";
import { downloadResponsesExport } from "@/features/typeform/utils/download-responses-export";

type ResponseExportButtonProps = {
  baseHref: string;
  scope: "participants" | "winners";
  label: string;
  variant: "participants" | "winners";
  canExport: boolean;
  disabledMessage?: string;
  disabledDescription?: string;
  winnerFlowToken?: string;
  requestWinnerFlowToken?: () => Promise<string | undefined>;
};

export function ResponseExportButton({
  baseHref,
  scope,
  label,
  variant,
  canExport,
  disabledMessage = "No tienes permisos para exportar",
  disabledDescription = "Solo los usuarios con rol editor pueden descargar respuestas.",
  winnerFlowToken,
  requestWinnerFlowToken,
}: ResponseExportButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const pendingRef = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => { requestRef.current?.abort(); }, []);
  const allowed = canExport && (scope !== "winners" || Boolean(winnerFlowToken || requestWinnerFlowToken));
  const baseClassName =
    "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35] motion-reduce:transition-none";
  const variantClassName =
    variant === "winners"
      ? "border-[#FF5C35]/35 bg-[#FFF8F5] text-[#A53318]"
      : "border-[#D1D1CD] bg-white text-[#595954]";
  const interactionClassName = !allowed
    ? "cursor-not-allowed opacity-60"
    : isPending
      ? "cursor-wait opacity-60"
      : variant === "winners"
        ? "cursor-pointer hover:border-[#FF5C35] hover:bg-[#FFF1EC]"
        : "cursor-pointer hover:border-[#FF5C35]/60 hover:text-[#A53318]";

  async function handleClick() {
    if (pendingRef.current) {
      return;
    }

    if (!allowed) {
      toast.error(canExport && scope === "winners" ? "Inicia la consulta de ganadores para exportar sus datos" : disabledMessage, { description: disabledDescription });
      return;
    }

    pendingRef.current = true;
    setIsPending(true);
    const controller = new AbortController();
    requestRef.current = controller;

    try {
      const flowToken = scope === "winners" ? winnerFlowToken ?? await requestWinnerFlowToken?.() : undefined;
      if (controller.signal.aborted || (scope === "winners" && !flowToken)) return;
      await downloadResponsesExport(baseHref, scope, { winnerFlowToken: flowToken, signal: controller.signal });
    } catch (error) {
      if (controller?.signal.aborted) return;
      toast.error("No se pudo exportar", {
        description: error instanceof TypeError
          ? "No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo."
          : error instanceof Error
            ? error.message
            : "Inténtalo de nuevo en unos momentos.",
      });
    } finally {
      pendingRef.current = false;
      requestRef.current = null;
      setIsPending(false);
    }
  }

  return (
    <button
      type="button"
      className={`${baseClassName} ${variantClassName} ${interactionClassName}`}
      disabled={isPending}
      aria-disabled={!allowed || isPending}
      aria-busy={isPending}
      aria-label={`Exportar ${label.toLocaleLowerCase("es")} a Excel`}
      onClick={handleClick}
    >
      {isPending ? (
        <LuLoader aria-hidden="true" className="size-3.5 shrink-0 animate-spin motion-reduce:animate-none" />
      ) : (
        <LuDownload aria-hidden="true" className="size-3.5 shrink-0" />
      )}
      {label}
      <span role="status" className="sr-only">
        {isPending ? "Preparando descarga…" : ""}
      </span>
    </button>
  );
}