export default function NewWorkspaceFormLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden>
      <header className="space-y-3 border-b border-[#F5F5F5] pb-6">
        <div className="h-3 w-40 rounded-md bg-[#F5F5F5]" />
        <div className="h-8 w-96 max-w-full rounded-md bg-[#F5F5F5]" />
        <div className="h-4 w-120 max-w-full rounded-md bg-[#F5F5F5]" />
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <article
            key={index}
            className="rounded-xl border border-[#F5F5F5] bg-[#FFFFFF] p-5"
          >
            <div className="h-5 w-2/3 rounded-md bg-[#F5F5F5]" />
            <div className="mt-2 h-3 w-3/5 rounded-md bg-[#F5F5F5]" />
            <div className="mt-4 h-3 w-full rounded-md bg-[#F5F5F5]" />
            <div className="mt-2 h-3 w-4/5 rounded-md bg-[#F5F5F5]" />
            <div className="mt-5 h-9 w-40 rounded-lg bg-[#F5F5F5]" />
          </article>
        ))}
      </section>

      <div className="rounded-xl border border-[#F5F5F5] bg-[#FFFFFF] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="h-4 w-40 rounded-md bg-[#F5F5F5]" />
          <div className="h-9 w-44 rounded-lg bg-[#F5F5F5]" />
        </div>
      </div>
    </div>
  );
}