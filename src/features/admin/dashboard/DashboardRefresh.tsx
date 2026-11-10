"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LuRefreshCw } from "react-icons/lu";

type Props = {
  updatedAt: string;
  updatedAtLabel: string;
};

export function DashboardRefresh({ updatedAt, updatedAtLabel }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => router.refresh())}
        className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-[#FF5C35]/40 bg-white px-3 text-sm font-medium text-[#A53318] transition-colors hover:border-[#FF5C35] hover:bg-[#FFF1EC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35] disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
      >
        <LuRefreshCw aria-hidden="true" className={`size-4 shrink-0 ${isPending ? "animate-spin motion-reduce:animate-none" : ""}`} />
        {isPending ? "Actualizando…" : "Actualizar"}
      </button>
      <p role="status" aria-atomic="true" className="text-sm leading-5 text-[#595954]">
        {isPending ? "Consultando los datos más recientes." : (
          <>Consultado: <time dateTime={updatedAt}>{updatedAtLabel}</time> UTC</>
        )}
      </p>
    </div>
  );
}