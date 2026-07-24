import { AdminWorkspacesGridSkeleton } from "@/features/admin/workspaces/components/AdminWorkspacesGridSkeleton";

export default function AdminWorkspacesLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-72 rounded-md bg-zinc-800" />
          <div className="h-4 w-120 max-w-full rounded-md bg-zinc-900" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-40 rounded-lg border border-zinc-800 bg-zinc-900" />
          <div className="h-10 w-40 rounded-lg border border-zinc-800 bg-zinc-900" />
        </div>
      </div>

      <AdminWorkspacesGridSkeleton count={4} />
    </div>
  );
}