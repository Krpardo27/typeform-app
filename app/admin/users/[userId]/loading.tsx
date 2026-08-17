export default function AdminUserDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden>
      <div className="space-y-3">
        <div className="h-8 w-28 rounded-md bg-[#F5F5F5]" />
        <div className="h-8 w-64 rounded-md bg-zinc-800" />
        <div className="h-4 w-72 rounded-md bg-[#F5F5F5]" />
      </div>

      <div className="rounded-xl border border-[#F5F5F5] bg-[#FFFFFF] p-6">
        <div className="h-5 w-56 rounded-md bg-zinc-800" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-12 rounded-lg border border-[#F5F5F5] bg-[#F5F5F5]"
            />
          ))}
        </div>
        <div className="mt-5 h-10 w-40 rounded-lg bg-zinc-800" />
      </div>
    </div>
  );
}