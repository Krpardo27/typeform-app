"use client";

export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-lg font-semibold text-[#171717]">Ocurrió un error inesperado</h1>
      <p className="max-w-md text-sm text-[#737373]">No pudimos cargar esta página. Intenta nuevamente.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#171717] hover:bg-[#FAFAFA]"
      >
        Reintentar
      </button>
    </main>
  );
}
