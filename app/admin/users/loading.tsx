export default function AdminUsersLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-72 rounded-md bg-[#E5E5E5]" />
          <div className="h-4 w-80 rounded-md bg-[#E5E5E5]" />
        </div>
        <div className="h-10 w-36 rounded-lg border border-[#E5E5E5] bg-[#F5F5F5]" />
      </div>

      <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-5">
        <div className="mb-4 h-10 rounded-lg bg-[#E5E5E5]" />
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-14 rounded-lg border border-[#E5E5E5] bg-[#F5F5F5]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}