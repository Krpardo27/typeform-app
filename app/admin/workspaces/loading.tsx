import { AdminWorkspacesGridSkeleton } from "@/features/admin/workspaces/components/AdminWorkspacesGridSkeleton";
import { AdminPaginationSkeleton } from "@/features/admin/components/AdminLoadingSkeletons";
import { WORKSPACE_PAGE_SIZES } from "@/features/admin/workspaces/utils/workspace-view";

export default function AdminWorkspacesLoading() {
  return (
    <div className="relative min-w-0">
      <p role="status" className="sr-only">Cargando workspaces disponibles.</p>
      <div aria-hidden="true" className="min-w-0 space-y-7">
        <div className="flex min-w-0 animate-pulse flex-col gap-5 border-b border-[#E5E5E5] pb-6 motion-reduce:animate-none xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="h-5 w-28 max-w-full rounded-sm bg-[#E5E5E5]" />
            <div className="h-8 w-72 max-w-full rounded-sm bg-[#E5E5E5]" />
            <div className="h-5 w-full max-w-lg rounded-sm bg-[#E5E5E5]" />
          </div>
          <div className="flex min-w-0 flex-wrap gap-3">
            <div className="h-11 w-40 max-w-full rounded-md bg-[#E5E5E5]" />
            <div className="h-11 w-40 max-w-full rounded-md bg-[#E5E5E5]" />
          </div>
        </div>

        <AdminWorkspacesGridSkeleton count={WORKSPACE_PAGE_SIZES[0]} announce={false} />
        <div className="animate-pulse motion-reduce:animate-none"><AdminPaginationSkeleton /></div>
      </div>
    </div>
  );
}