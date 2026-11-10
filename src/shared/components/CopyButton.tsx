"use client";

import { useState } from "react";
import { LuCheck, LuCopy } from "react-icons/lu";

type CopyButtonProps = {
  value: string;
  label?: string;
  variant?: "default" | "subtle";
};

export function CopyButton({ value, label = "Copiar ID", variant = "default" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1800);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copiado al portapapeles" : label}
      className={variant === "subtle"
        ? `inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-sm px-1 text-sm font-medium underline-offset-4 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35] motion-reduce:transition-none ${copied ? "text-[#356044]" : "text-[#595954] hover:text-[#A53318]"}`
        : `cursor-pointer
      inline-flex
      items-center
      gap-2
      rounded-xl
      border
      px-3 py-2
      text-sm
      font-medium
      shadow-sm
      transition-all
      duration-200
      ${
        copied
          ? `
            border-[#00BFA5]/50
            bg-[#00BFA5]/[0.06]
            text-[#00A88F]
            shadow-[0_4px_12px_-8px_rgba(0,191,165,0.35)]
          `
          : `
            border-[#D1D1CD]
            bg-white
            text-[#000000]/70
            hover:-translate-y-0.5
            hover:border-[#FF5C35]/60
            hover:bg-[#FFF9F7]
            hover:text-[#FF5C35]
            hover:shadow-[0_6px_16px_-10px_rgba(255,92,53,0.35)]
          `
      }
    `}
    >
      {copied ? <LuCheck aria-hidden="true" className="size-4" /> : <LuCopy aria-hidden="true" className="size-4" />}

      {copied ? "Copiado" : label}
    </button>
  );
}
