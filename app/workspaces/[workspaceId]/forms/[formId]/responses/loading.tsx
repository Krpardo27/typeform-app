export default function WorkspaceFormResponsesLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden>
      <header className="border-b border-zinc-800/60 pb-6">
        <div className="h-4 w-44 rounded-md bg-zinc-900" />
        <div className="mt-5 h-3 w-28 rounded-md bg-zinc-800" />
        <div className="mt-3 h-8 w-96 max-w-full rounded-md bg-zinc-800" />
        <div className="mt-2 h-4 w-lg max-w-full rounded-md bg-zinc-900" />
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <article
            key={index}
            className="rounded-xl border border-zinc-800 bg-[#111113] p-5"
          >
            <div className="h-3 w-24 rounded-md bg-zinc-800" />
            <div className="mt-3 h-8 w-16 rounded-md bg-zinc-800" />
            <div className="mt-2 h-3 w-20 rounded-md bg-zinc-900" />
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-[#111113] p-5">
        <div className="h-5 w-56 rounded-md bg-zinc-800" />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-24 rounded-lg border border-zinc-800 bg-zinc-900"
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="h-14 rounded-xl border border-zinc-800 bg-[#111113]" />

        {Array.from({ length: 3 }).map((_, index) => (
          <article
            key={index}
            className="rounded-xl border border-zinc-800 bg-[#111113] p-5"
          >
            <div className="h-4 w-56 rounded-md bg-zinc-800" />
            <div className="mt-3 h-3 w-72 rounded-md bg-zinc-900" />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="h-16 rounded-lg bg-zinc-900" />
              <div className="h-16 rounded-lg bg-zinc-900" />
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
