export default function AdminUsersLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-72 rounded-md bg-zinc-800" />
          <div className="h-4 w-80 rounded-md bg-zinc-900" />
        </div>
        <div className="h-10 w-36 rounded-lg border border-zinc-800 bg-zinc-900" />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-[#111113] p-5">
        <div className="mb-4 h-10 rounded-lg bg-zinc-900" />
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-14 rounded-lg border border-zinc-800 bg-zinc-900/60"
            />
          ))}
        </div>
      </div>
    </div>
  );
}