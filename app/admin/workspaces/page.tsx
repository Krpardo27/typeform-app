import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import WorkspacesPageClient from "@/features/admin/workspaces/components/WorkspacesPageClient";
import { AdminWorkspacesContent } from "@/features/admin/workspaces/components/AdminWorkspacesContent";
import { AdminWorkspacesGridSkeleton } from "@/features/admin/workspaces/components/AdminWorkspacesGridSkeleton";

const PAGE_SIZE_OPTIONS = [12, 24, 48] as const;
const DEFAULT_PAGE_SIZE = 12;

function getFallbackCount(totalCount: number, currentPage: number, itemsPerPage: number) {
  if (totalCount <= 0) return 4;

  const offset = (currentPage - 1) * itemsPerPage;
  const remaining = Math.max(totalCount - offset, 0);
  const countForPage = remaining > 0 ? Math.min(itemsPerPage, remaining) : itemsPerPage;

  return Math.min(countForPage, 24);
}

function resolveItemsPerPage(pageSize?: string) {
  const parsed = Number.parseInt(pageSize ?? String(DEFAULT_PAGE_SIZE), 10);
  return PAGE_SIZE_OPTIONS.includes(parsed as (typeof PAGE_SIZE_OPTIONS)[number])
    ? parsed
    : DEFAULT_PAGE_SIZE;
}

export default async function AdminWorkspacesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}) {
  const { page, pageSize } = await searchParams;
  const itemsPerPage = resolveItemsPerPage(pageSize);
  const requestedPage = Number.parseInt(page ?? "1", 10) || 1;

  const workspaceCount = await prisma.workspace.count();
  const totalPages = Math.max(1, Math.ceil(workspaceCount / itemsPerPage));
  const currentPage = Math.min(Math.max(requestedPage, 1), totalPages);
  const fallbackCount = getFallbackCount(workspaceCount, currentPage, itemsPerPage);

  return (
    <>
      <AdminPageHeader
        title="Workspaces disponibles"
        description="Inventario completo de radios y marcas configuradas en la app."
        actions={
          <>
            <WorkspacesPageClient />

            <Link
              href="/admin/users"
              className="inline-flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 transition hover:border-[#C8A96E] hover:text-[#C8A96E]"
            >
              Gestionar usuarios
            </Link>
          </>
        }
      />

      <Suspense fallback={<AdminWorkspacesGridSkeleton count={fallbackCount} />}>
        <AdminWorkspacesContent
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          pageSizeOptions={[...PAGE_SIZE_OPTIONS]}
        />
      </Suspense>
    </>
  );
}