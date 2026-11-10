"use client";

export default function ResponsesError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <section aria-labelledby="responses-error-title" className="mt-6 rounded-lg border border-[#E5E5E5] bg-white px-5 py-8 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-wider text-[#A53318]">
        Carga no completada
      </p>
      <h2 id="responses-error-title" className="mt-2 text-base font-semibold text-[#171717]">
        No se pudieron cargar los participantes
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[#595954]">
        No pudimos obtener todas las respuestas del concurso. Esto no significa
        que no haya participantes. Vuelve a intentarlo en unos momentos.
      </p>
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="mt-4 inline-flex min-h-10 cursor-pointer items-center rounded-md border border-[#D1D1CD] px-3 py-2 text-sm font-medium text-[#595954] transition-colors hover:border-[#FF5C35] hover:text-[#A53318] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35] motion-reduce:transition-none"
      >
        Reintentar carga
      </button>
    </section>
  );
}