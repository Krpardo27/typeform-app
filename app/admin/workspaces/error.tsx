"use client";

import Link from "next/link";
import { useTransition } from "react";
import { LuCircleAlert, LuRefreshCw } from "react-icons/lu";

type Props = {
  error: Error & { digest?: string };
  unstable_retry: () => void;
};

export default function AdminWorkspacesError({ unstable_retry }: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <section aria-labelledby="workspaces-error-title" className="rounded-md border border-[#FF5C35]/35 bg-white p-5 sm:p-7">
      <div className="mb-4 flex items-center gap-2 text-sm text-[#A53318]">
        <LuCircleAlert aria-hidden="true" className="size-5 shrink-0" />
        Workspaces
      </div>
      <h1 id="workspaces-error-title" className="text-xl font-semibold tracking-tight text-[#171717] sm:text-2xl">No pudimos cargar esta vista</h1>
      <p className="mt-3 max-w-lg text-sm leading-6 text-[#595954]">
        Hubo un problema al consultar la información. Puedes volver a intentarlo; no se ha modificado ningún dato.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => unstable_retry())}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-[#FF5C35] px-4 text-sm font-semibold text-[#171717] transition-colors hover:bg-[#F4512B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171717] disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none"
        >
          <LuRefreshCw aria-hidden="true" className={`size-4 ${isPending ? "animate-spin motion-reduce:animate-none" : ""}`} />
          {isPending ? "Reintentando…" : "Reintentar"}
        </button>
        <Link href="/admin/dashboard" className="inline-flex min-h-11 items-center rounded-sm text-sm text-[#595954] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35]">Ir al resumen</Link>
      </div>
      <p role="status" className="sr-only">{isPending ? "Volviendo a consultar los datos." : "No se pudo cargar la vista de workspaces."}</p>
    </section>
  );
}