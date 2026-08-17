export default function WorkspaceFormDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden>
      <header className="border-b border-[#F5F5F5] pb-6">
        <div className="h-4 w-40 rounded-md bg-[#F5F5F5]" />
        <div className="mt-5 h-3 w-28 rounded-md bg-[#E5E5E5]" />
        <div className="mt-3 h-8 w-80 rounded-md bg-[#E5E5E5]" />
        <div className="mt-2 h-4 w-56 rounded-md bg-[#F5F5F5]" />

        <div className="mt-5 flex flex-wrap gap-3">
          <div className="h-10 w-36 rounded-lg bg-[#F5F5F5]" />
          <div className="h-10 w-36 rounded-lg bg-[#F5F5F5]" />
        </div>
      </header>

      <div className="rounded-xl border border-[#F5F5F5] bg-[#FFFFFF] p-5">
        <div className="h-5 w-52 rounded-md bg-[#E5E5E5]" />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="h-10 rounded-lg bg-[#F5F5F5] md:col-span-2" />
          <div className="h-10 rounded-lg bg-[#E5E5E5]" />
          <div className="h-11 rounded-lg bg-[#E5E5E5]" />
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <article
            key={index}
            className="rounded-xl border border-[#F5F5F5] bg-[#FFFFFF] p-5"
          >
            <div className="h-3 w-24 rounded-md bg-[#E5E5E5]" />
            <div className="mt-3 h-8 w-12 rounded-md bg-[#E5E5E5]" />
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-[#F5F5F5] bg-[#FFFFFF] p-5">
        <div className="h-5 w-44 rounded-md bg-[#E5E5E5]" />
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-14 rounded-lg border border-[#F5F5F5] bg-[#F5F5F5]"
            />
          ))}
        </div>
      </section>
    </div>
  );
}