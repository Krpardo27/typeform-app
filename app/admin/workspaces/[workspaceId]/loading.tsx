const ITEMS_PER_PAGE = 10;

export default function AdminWorkspaceDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden>
      <div className="space-y-3">
        <div className="h-4 w-36 rounded-md bg-[#F5F5F5]" />
        <div className="h-8 w-72 rounded-md bg-zinc-800" />
        <div className="h-4 w-full max-w-xl rounded-md bg-[#F5F5F5]" />
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="h-10 w-32 rounded-lg border border-[#F5F5F5] bg-[#F5F5F5]" />
        <div className="h-10 w-40 rounded-lg border border-[#F5F5F5] bg-[#F5F5F5]" />
        <div className="h-10 w-36 rounded-lg border border-[#F5F5F5] bg-[#F5F5F5]" />
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
          <article
            key={index}
            className="rounded-xl border border-[#F5F5F5] bg-[#FFFFFF] p-5"
          >
            <div className="h-5 w-2/3 rounded-md bg-zinc-800" />
            <div className="mt-2 h-3 w-full rounded-md bg-[#F5F5F5]" />
            <div className="mt-1 h-3 w-4/5 rounded-md bg-[#F5F5F5]" />
            <div className="mt-3 h-3 w-1/2 rounded-md bg-[#F5F5F5]" />
            <div className="mt-5 flex gap-2">
              <div className="h-6 w-24 rounded-md bg-[#F5F5F5]" />
              <div className="h-6 w-16 rounded-md bg-[#F5F5F5]" />
            </div>
          </article>
        ))}
      </section>

      <div className="flex items-center justify-between rounded-xl border border-[#F5F5F5] bg-[#FFFFFF] p-4">
        <div className="h-4 w-32 rounded-md bg-[#F5F5F5]" />
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-lg bg-[#F5F5F5]" />
          <div className="h-9 w-24 rounded-lg bg-[#F5F5F5]" />
        </div>
      </div>
    </div>
  );
}