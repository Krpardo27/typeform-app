export default function AdminDashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden>
      <div className="space-y-2">
        <div className="h-8 w-64 rounded-md bg-[#E5E5E5]" />
        <div className="h-4 w-96 rounded-md bg-[#E5E5E5]" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-5"
          >
            <div className="h-4 w-20 rounded-md bg-[#E5E5E5]" />
            <div className="mt-3 h-8 w-16 rounded-md bg-[#E5E5E5]" />
            <div className="mt-3 h-3 w-28 rounded-md bg-[#F5F5F5]" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-5">
        <div className="mb-4 h-5 w-44 rounded-md bg-[#E5E5E5]" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-14 rounded-lg bg-[#F5F5F5]" />
          ))}
        </div>
      </div>
    </div>
  );
}
