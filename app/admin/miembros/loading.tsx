export default function AdminMembersLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden>
      <div className="space-y-2">
        <div className="h-8 w-64 rounded-md bg-zinc-800" />
        <div className="h-4 w-96 rounded-md bg-[#F5F5F5]" />
      </div>

      <div className="rounded-xl border border-[#F5F5F5] bg-[#FFFFFF] p-6">
        <div className="h-5 w-44 rounded-md bg-zinc-800" />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="h-10 rounded-lg bg-[#F5F5F5]" />
          <div className="h-10 rounded-lg bg-[#F5F5F5]" />
          <div className="h-24 rounded-lg bg-[#F5F5F5] md:col-span-2" />
          <div className="h-10 w-36 rounded-lg bg-zinc-800" />
        </div>
      </div>

      <div className="rounded-xl border border-[#F5F5F5] bg-[#FFFFFF] p-6">
        <div className="h-5 w-52 rounded-md bg-zinc-800" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-12 rounded-lg bg-[#F5F5F5]" />
          ))}
        </div>
      </div>
    </div>
  );
}