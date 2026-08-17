"use client";

import { useState } from "react";
import { LuCheck, LuCopy } from "react-icons/lu";

type CopyButtonProps = {
  value: string;
  label?: string;
};

export function CopyButton({ value, label = "Copiar ID" }: CopyButtonProps) {
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
      className={`
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
              border-[#00BFA5]/30
              bg-[#00BFA5]/[0.06]
              text-[#00A88F]
              shadow-[0_4px_12px_-8px_rgba(0,191,165,0.35)]
            `
            : `
              border-[#E8E8E6]
              bg-white
              text-[#000000]/70
              hover:-translate-y-0.5
              hover:border-[#FF5C35]/35
              hover:bg-[#FFF9F7]
              hover:text-[#FF5C35]
              hover:shadow-[0_6px_16px_-10px_rgba(255,92,53,0.35)]
            `
        }
      `}
    >
      {copied ? <LuCheck className="size-4" /> : <LuCopy className="size-4" />}

      {copied ? "Copiado" : label}
    </button>
  );
}
