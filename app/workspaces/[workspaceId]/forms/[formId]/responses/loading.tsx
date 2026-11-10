export default function WorkspaceFormResponsesLoading() {
  return (
    <div
      role="status"
      aria-label="Cargando participantes"
      className="relative min-w-0 space-y-6 animate-pulse motion-reduce:animate-none"
    >
      <header aria-hidden="true" className="border-b border-[#F5F5F5] pb-6">
        <div className="h-4 w-44 rounded-md bg-[#F5F5F5]" />
        <div className="mt-5 h-3 w-28 rounded-md bg-[#E5E5E5]" />
        <div className="mt-3 h-8 w-96 max-w-full rounded-md bg-[#E5E5E5]" />
        <div className="mt-2 h-4 w-lg max-w-full rounded-md bg-[#F5F5F5]" />
      </header>

      <section aria-hidden="true" className="grid max-w-xl grid-cols-2 gap-3">
        {Array.from({ length: 2 }).map((_, index) => (
          <article
            key={index}
            className="min-w-0 rounded-lg border border-[#E5E5E5] bg-white p-4"
          >
            <div className="min-h-10 sm:min-h-0">
              <div className="h-5 w-24 max-w-full rounded-md bg-[#E5E5E5]" />
            </div>
            <div className="mt-3 h-6 w-16 max-w-full rounded-md bg-[#E5E5E5]" />
          </article>
        ))}
      </section>

      <section aria-hidden="true" className="min-w-0 rounded-md border border-[#E5E5E5] bg-white p-4">
        <div className="h-5 w-56 max-w-full rounded-md bg-[#E5E5E5]" />
        <div className="mt-2 h-4 w-72 max-w-full rounded-md bg-[#F5F5F5]" />
        <div className="mt-5 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,450px)]">
          <div className="min-w-0 space-y-3">
            <div className="h-11 rounded-md bg-[#F5F5F5]" />
            <div className="overflow-hidden rounded-md border border-[#E5E5E5]">
              <div className="h-10 bg-[#F5F5F5]" />
              {Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-12 border-t border-[#E5E5E5]" />)}
            </div>
          </div>
          <div className="min-w-0 space-y-4 rounded-md border border-[#E5E5E5] p-4">
            <div className="h-5 w-40 max-w-full rounded-md bg-[#E5E5E5]" />
            {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-11 rounded-md bg-[#F5F5F5]" />)}
          </div>
        </div>
        <div className="mt-5 h-11 w-44 max-w-full rounded-md bg-[#E5E5E5]" />
      </section>
    </div>
  );
}
