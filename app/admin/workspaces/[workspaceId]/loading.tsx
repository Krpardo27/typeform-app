import { AdminWorkspacesGridSkeleton } from "@/features/admin/workspaces/components/AdminWorkspacesGridSkeleton";
import { WORKSPACE_FORMS_PAGE_SIZE } from "@/features/admin/workspaces/utils/workspace-view";
import { AdminPaginationSkeleton } from "@/features/admin/components/AdminLoadingSkeletons";

export default function AdminWorkspaceDetailLoading() {
  return (
    <div className="relative min-w-0">
      <p role="status" className="sr-only">Cargando el workspace y sus formularios.</p>
      <div aria-hidden="true" className="min-w-0 space-y-7">
        <div className="min-w-0 animate-pulse border-b border-[#E5E5E5] pb-6 motion-reduce:animate-none">
          <div className="h-11 w-40 max-w-full rounded-sm bg-[#E5E5E5]" />
          <div className="mt-3 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="size-25 shrink-0 rounded-sm bg-[#F0F0ED]" />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="h-8 w-72 max-w-full rounded-sm bg-[#E5E5E5]" />
              <div className="flex min-w-0 flex-wrap gap-4">
                <div className="h-10 w-40 max-w-full rounded-sm bg-[#F0F0ED]" />
                <div className="h-10 w-56 max-w-full rounded-sm bg-[#F0F0ED]" />
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <AdminWorkspacesGridSkeleton count={WORKSPACE_FORMS_PAGE_SIZE} variant="form" announce={false} />
          <div className="animate-pulse motion-reduce:animate-none"><AdminPaginationSkeleton /></div>
        </div>
      </div>
    </div>
  );
}