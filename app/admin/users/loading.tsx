import { AdminHeaderSkeleton, AdminTableSkeleton } from "@/features/admin/components/AdminLoadingSkeletons";

export default function AdminUsersLoading() {
  return (
    <div className="relative min-w-0">
      <p role="status" className="sr-only">Cargando usuarios y sus radios asignadas.</p>
      <div aria-hidden="true" className="min-w-0 animate-pulse motion-reduce:animate-none">
        <AdminHeaderSkeleton />
        <AdminTableSkeleton />
      </div>
    </div>
  );
}