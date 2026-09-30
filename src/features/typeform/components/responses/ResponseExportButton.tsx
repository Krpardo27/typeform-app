"use client";

import { LuDownload } from "react-icons/lu";
import { toast } from "sonner";

type ResponseExportButtonProps = {
  baseHref: string;
  scope: "participants" | "winners";
  label: string;
  variant: "participants" | "winners";
  canExport: boolean;
  disabledMessage?: string;
  disabledDescription?: string;
};

export function ResponseExportButton({
  baseHref,
  scope,
  label,
  variant,
  canExport,
  disabledMessage = "No tienes permisos para exportar",
  disabledDescription = "Solo los usuarios con rol editor pueden descargar respuestas.",
}: ResponseExportButtonProps) {
  const variantClassName =
    variant === "winners"
      ? "inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#D5B45D]/35 bg-[#D5B45D]/15 px-3 py-2 text-xs font-medium text-[#8A6A00] transition-colors hover:border-[#D5B45D]/55 hover:bg-[#D5B45D]/25 sm:py-1.5"
      : "inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#00A88F]/25 bg-[#00A88F]/10 px-3 py-2 text-xs font-medium text-[#007C6A] transition-colors hover:border-[#00A88F]/40 hover:bg-[#00A88F]/15 sm:py-1.5";
  const className = canExport
    ? variantClassName
    : `${variantClassName} cursor-not-allowed opacity-60`;

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (canExport) {
      return;
    }

    event.preventDefault();

    toast.error(disabledMessage, {
      description: disabledDescription,
    });
  }

  return (
    <a
      href={`${baseHref}?scope=${scope}&format=xlsx`}
      className={className}
      aria-disabled={!canExport}
      onClick={handleClick}
    >
      <LuDownload className="size-3.5" />
      {label}
    </a>
  );
}