import { AdminHeaderSkeleton, WorkspaceAccessFormSkeleton } from "@/features/admin/components/AdminLoadingSkeletons";

export default function AdminUserDetailLoading() {
  return (
    <div className="relative min-w-0">
      <p role="status" className="sr-only">Cargando el usuario y sus permisos de acceso.</p>
      <div aria-hidden="true" className="min-w-0 animate-pulse motion-reduce:animate-none">
        <AdminHeaderSkeleton back />
        <WorkspaceAccessFormSkeleton />
      </div>
    </div>
  );
}