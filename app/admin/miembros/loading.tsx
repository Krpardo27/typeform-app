import { AdminHeaderSkeleton, AdminTableSkeleton, WorkspaceAccessFormSkeleton } from "@/features/admin/components/AdminLoadingSkeletons";

export default function AdminMembersLoading() {
  return (
    <div className="relative min-w-0">
      <p role="status" className="sr-only">Cargando miembros y accesos a workspaces.</p>
      <div aria-hidden="true" className="min-w-0 animate-pulse motion-reduce:animate-none">
        <AdminHeaderSkeleton />
        <div className="min-w-0 space-y-6">
          <WorkspaceAccessFormSkeleton withEmail />
          <AdminTableSkeleton members />
        </div>
      </div>
    </div>
  );
}