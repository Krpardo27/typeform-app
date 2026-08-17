export default function WorkspaceFormsLoading() {
  return (
    <div className="space-y-8 animate-pulse" aria-hidden>
      <header className="border-b border-[#F5F5F5] pb-6">
        <div className="flex items-center gap-2">
          <div className="size-3.5 rounded-full bg-[#FF5C35]/30" />
          <div className="h-3 w-24 rounded-md bg-[#F5F5F5]" />
        </div>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="h-9 w-80 max-w-full rounded-md bg-[#F5F5F5]" />
            <div className="h-4 w-96 max-w-full rounded-md bg-[#F5F5F5]" />
            <div className="h-4 w-72 max-w-full rounded-md bg-[#F5F5F5]" />
          </div>
          <div className="h-10 w-36 rounded-lg border border-[#F5F5F5] bg-[#F5F5F5]" />
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <article
            key={index}
            className="rounded-xl border border-[#F5F5F5] bg-[#FFFFFF] p-5"
          >
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg border border-[#F5F5F5] bg-[#F5F5F5]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 rounded-md bg-[#F5F5F5]" />
                <div className="h-3 w-1/2 rounded-md bg-[#F5F5F5]" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-3 w-full rounded-md bg-[#F5F5F5]" />
              <div className="h-3 w-5/6 rounded-md bg-[#F5F5F5]" />
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}