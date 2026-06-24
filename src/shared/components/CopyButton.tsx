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
      className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 transition hover:border-[#C8A96E] hover:text-[#C8A96E]"
    >
      {copied ? <LuCheck className="size-4" /> : <LuCopy className="size-4" />}
      {copied ? "Copiado" : label}
    </button>
  );
}
