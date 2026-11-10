export function AdminHeaderSkeleton({ back = false }: { back?: boolean }) {
  return (
    <div className="mb-6 min-w-0 space-y-3 border-b border-[#E5E5E5] pb-5 sm:mb-8 sm:pb-6">
      <div className={`${back ? "h-11 w-36" : "h-5 w-28"} max-w-full rounded-sm bg-[#E5E5E5]`} />
      <div className="h-8 w-80 max-w-full rounded-sm bg-[#E5E5E5]" />
      <div className="h-6 w-full max-w-lg rounded-sm bg-[#F0F0ED]" />
    </div>
  );
}

export function AdminPaginationSkeleton() {
  return (
    <div className="flex min-w-0 flex-col gap-3 border-t border-[#E8E8E6] px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="h-5 w-40 max-w-full rounded-sm bg-[#F0F0ED]" />
      <div className="flex min-w-0 flex-wrap gap-2">
        <div className="h-11 w-28 max-w-full rounded-md bg-[#F0F0ED]" />
        <div className="h-11 w-36 max-w-full rounded-md bg-[#F0F0ED]" />
      </div>
    </div>
  );
}

export function AdminTableSkeleton({ members = false }: { members?: boolean }) {
  const columns = members
    ? "grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
    : "grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)]";

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-[#E5E5E5] bg-white">
      {members && (
        <div className="space-y-2 border-b border-[#E5E5E5] p-4 sm:p-5">
          <div className="h-6 w-56 max-w-full rounded-sm bg-[#E5E5E5]" />
          <div className="h-5 w-72 max-w-full rounded-sm bg-[#F0F0ED]" />
        </div>
      )}
      <div className="overflow-hidden">
        <div className={members ? "min-w-160 lg:min-w-190" : "min-w-180 lg:min-w-220"}>
          <div className={`grid ${columns} gap-5 border-b border-[#E5E5E5] bg-[#FBFBFA] px-4 py-4 sm:px-5`}>
            {Array.from({ length: members ? 2 : 4 }).map((_, index) => (
              <div key={index} className="h-4 w-20 max-w-full rounded-sm bg-[#E5E5E5]" />
            ))}
          </div>
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className={`grid ${columns} items-start gap-5 border-b border-[#E5E5E5] px-4 py-4 last:border-b-0 sm:px-5`}>
              <div className="min-w-0 space-y-2">
                <div className="h-5 w-36 max-w-full rounded-sm bg-[#E5E5E5]" />
                <div className="h-4 w-48 max-w-full rounded-sm bg-[#F0F0ED]" />
              </div>
              {!members && <div className="h-5 w-20 max-w-full rounded-sm bg-[#F0F0ED]" />}
              <div className="flex min-w-0 gap-2">
                <div className="size-12 shrink-0 rounded-sm bg-[#F0F0ED]" />
                <div className="size-12 shrink-0 rounded-sm bg-[#F0F0ED]" />
              </div>
              {!members && <div className="h-10 w-20 max-w-full rounded-md bg-[#F0F0ED]" />}
            </div>
          ))}
        </div>
      </div>
      <AdminPaginationSkeleton />
    </div>
  );
}

function WorkspaceAccessSelectorSkeleton() {
  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-2 xl:gap-8">
      <div className="min-w-0">
        <div className="h-5 w-48 max-w-full rounded-sm bg-[#E5E5E5]" />
        <div className="mt-2 h-5 w-full max-w-sm rounded-sm bg-[#F0F0ED]" />
        <div className="my-3 h-11 w-full rounded-md bg-[#F0F0ED]" />
        <div className="grid max-h-90 grid-cols-2 gap-2 overflow-hidden border-t border-[#E5E5E5] p-1 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex min-h-28 min-w-0 items-center justify-center rounded-md border border-[#E5E5E5] p-3">
              <div className="size-16 max-w-full rounded-sm bg-[#F0F0ED]" />
            </div>
          ))}
        </div>
      </div>
      <div className="min-w-0 space-y-3">
        <div className="h-5 w-40 max-w-full rounded-sm bg-[#E5E5E5]" />
        <div className="h-5 w-full max-w-sm rounded-sm bg-[#F0F0ED]" />
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="space-y-3 border-t border-[#E5E5E5] py-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="size-12 shrink-0 rounded-sm bg-[#F0F0ED]" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-5 w-36 max-w-full rounded-sm bg-[#E5E5E5]" />
                <div className="h-4 w-44 max-w-full rounded-sm bg-[#F0F0ED]" />
              </div>
            </div>
            <div className="flex min-w-0 flex-wrap gap-2">
              <div className="h-11 w-24 max-w-full rounded-md bg-[#F0F0ED]" />
              <div className="h-11 w-24 max-w-full rounded-md bg-[#F0F0ED]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WorkspaceAccessFormSkeleton({ withEmail = false }: { withEmail?: boolean }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-md border border-[#FF5C35]/35 bg-white">
      <div className="space-y-3 border-b border-[#FF5C35]/20 px-5 py-5 sm:px-6">
        <div className="h-7 w-56 max-w-full rounded-sm bg-[#E5E5E5]" />
        <div className="h-6 w-full max-w-md rounded-sm bg-[#F0F0ED]" />
        {!withEmail && (
          <div className="grid gap-3 pt-1 sm:grid-cols-2">
            <div className="h-10 rounded-sm bg-[#F0F0ED]" />
            <div className="h-10 rounded-sm bg-[#F0F0ED]" />
          </div>
        )}
      </div>
      <div className="min-w-0 space-y-6 p-5 sm:p-6">
        {withEmail && (
          <div className="max-w-lg space-y-2">
            <div className="h-5 w-36 max-w-full rounded-sm bg-[#E5E5E5]" />
            <div className="h-12 rounded-md bg-[#F0F0ED]" />
            <div className="h-5 w-full rounded-sm bg-[#F0F0ED]" />
          </div>
        )}
        <WorkspaceAccessSelectorSkeleton />
      </div>
      <div className="flex min-w-0 flex-col gap-4 border-t border-[#E8E8E6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="h-5 w-44 max-w-full rounded-sm bg-[#F0F0ED]" />
        <div className="h-11 w-full max-w-full rounded-md bg-[#E5E5E5] sm:w-40" />
      </div>
    </div>
  );
}