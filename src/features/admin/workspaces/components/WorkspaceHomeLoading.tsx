export function WorkspaceHomeLoading() {
  return (
    <div className="space-y-8 animate-pulse" aria-hidden>
      <header className="border-b border-zinc-800/60 pb-6">
        <div className="flex items-center gap-2">
          <div className="size-3.5 rounded-full bg-[#C8A96E]/40" />
          <div className="h-3 w-24 rounded-md bg-zinc-800" />
        </div>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="h-9 w-120 max-w-full rounded-md bg-zinc-800" />
            <div className="h-4 w-136 max-w-full rounded-md bg-zinc-900" />
            <div className="h-4 w-md max-w-full rounded-md bg-zinc-900" />
          </div>
          <div className="h-10 w-36 rounded-lg border border-zinc-800 bg-zinc-900" />
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 2 }).map((_, index) => (
          <article
            key={index}
            className="rounded-xl border border-zinc-800 bg-[#111113] p-5"
          >
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg border border-zinc-800 bg-zinc-900" />
              <div className="space-y-2">
                <div className="h-4 w-36 rounded-md bg-zinc-800" />
                <div className="h-3 w-56 rounded-md bg-zinc-900" />
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}