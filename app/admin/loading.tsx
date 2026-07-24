export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden>
      <div className="space-y-2">
        <div className="h-8 w-64 rounded-md bg-zinc-800" />
        <div className="h-4 w-80 rounded-md bg-zinc-900" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-zinc-800 bg-[#0f0f0f] p-6"
          >
            <div className="h-4 w-28 rounded-md bg-zinc-800" />
            <div className="mt-3 h-8 w-24 rounded-md bg-zinc-800" />
            <div className="mt-2 h-3 w-20 rounded-md bg-zinc-900" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-[#0f0f0f] p-6">
        <div className="h-5 w-48 rounded-md bg-zinc-800" />
        <div className="mt-4 space-y-3">
          <div className="h-3 w-full rounded-md bg-zinc-900" />
          <div className="h-3 w-11/12 rounded-md bg-zinc-900" />
          <div className="h-3 w-9/12 rounded-md bg-zinc-900" />
        </div>
      </div>
    </div>
  );
}