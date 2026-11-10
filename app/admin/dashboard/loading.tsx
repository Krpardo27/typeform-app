export default function AdminDashboardLoading() {
  return (
    <div className="relative min-w-0">
      <p role="status" className="sr-only">Cargando el resumen general.</p>
      <div aria-hidden="true" className="min-w-0 animate-pulse space-y-7 motion-reduce:animate-none">
        <div className="flex flex-col gap-5 border-b border-[#FF5C35]/30 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="h-3 w-24 max-w-full rounded-sm bg-[#E5E5E5]" />
            <div className="h-8 w-64 max-w-full rounded-sm bg-[#E5E5E5] sm:h-9" />
            <div className="h-4 w-full max-w-lg rounded-sm bg-[#E5E5E5]" />
          </div>
          <div className="min-w-0 space-y-2 sm:flex sm:shrink-0 sm:flex-col sm:items-end">
            <div className="h-11 w-28 max-w-full rounded-md bg-[#E5E5E5]" />
            <div className="h-5 w-52 max-w-full rounded-sm bg-[#E5E5E5]" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 divide-y divide-[#E8E8E6] rounded-md border border-[#FF5C35]/30 bg-white md:grid-cols-3 md:divide-x md:divide-y-0">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="min-w-0 p-5">
                <div className="h-5 w-24 max-w-full rounded-sm bg-[#E5E5E5]" />
                <div className="mt-3 h-8 w-16 rounded-sm bg-[#E5E5E5]" />
                <div className="mt-2 h-5 w-36 max-w-full rounded-sm bg-[#F5F5F5]" />
                <div className="mt-3 h-10 w-full rounded-sm bg-[#F5F5F5]" />
                <div className="mt-3 h-11 w-28 max-w-full rounded-sm bg-[#F5F5F5]" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-[#D1D1CD] bg-white">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-5 gap-y-2 border-b border-[#E8E8E6] px-5 py-4">
            <div className="min-w-0 space-y-2">
              <div className="h-6 w-40 max-w-full rounded-sm bg-[#E5E5E5]" />
              <div className="h-5 w-72 max-w-full rounded-sm bg-[#F5F5F5]" />
            </div>
            <div className="h-11 w-28 max-w-full rounded-sm bg-[#F5F5F5]" />
          </div>
          <div className="divide-y divide-[#E8E8E6]">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:justify-between sm:gap-6">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-5 w-40 max-w-full rounded-sm bg-[#F5F5F5]" />
                  <div className="h-4 w-64 max-w-full rounded-sm bg-[#F5F5F5]" />
                </div>
                <div className="h-5 w-40 max-w-full rounded-sm bg-[#F5F5F5]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
