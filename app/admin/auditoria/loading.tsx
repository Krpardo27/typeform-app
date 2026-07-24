export default function AdminAuditLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden>
      <div className="space-y-2">
        <div className="h-8 w-72 rounded-md bg-zinc-800" />
        <div className="h-4 w-96 rounded-md bg-zinc-900" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-zinc-800 bg-[#111113] p-5"
          >
            <div className="h-4 w-24 rounded-md bg-zinc-800" />
            <div className="mt-3 h-8 w-16 rounded-md bg-zinc-800" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-[#111113] p-5">
        <div className="h-5 w-40 rounded-md bg-zinc-800" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-14 rounded-lg border border-zinc-800 bg-zinc-900/50"
            />
          ))}
        </div>
      </div>
    </div>
  );
}