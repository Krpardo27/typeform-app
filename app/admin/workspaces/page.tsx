import Link from "next/link";
import type { Metadata } from "next";
import { LuUsers } from "react-icons/lu";
import { WorkspacePageHeader } from "@/features/admin/workspaces/components/WorkspacePageHeader";
import WorkspacesPageClient from "@/features/admin/workspaces/components/WorkspacesPageClient";
import { AdminWorkspacesContent } from "@/features/admin/workspaces/components/AdminWorkspacesContent";
import { getAdminWorkspacesPage } from "@/features/admin/workspaces/services/admin-workspaces-list.service";
import { WORKSPACE_PAGE_SIZES, parseWorkspacePage, parseWorkspacePageSize } from "@/features/admin/workspaces/utils/workspace-view";

export const metadata: Metadata = {
  title: "Workspaces",
};

export default async function AdminWorkspacesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[]; pageSize?: string | string[] }>;
}) {
  const { page, pageSize } = await searchParams;
  const itemsPerPage = parseWorkspacePageSize(pageSize);
  const requestedPage = parseWorkspacePage(page);

  const workspacesPage = await getAdminWorkspacesPage(requestedPage, itemsPerPage);
  const workspaceCount = workspacesPage.totalItems;

  return (
    <div className="space-y-7">
      <WorkspacePageHeader
        title="Workspaces disponibles"
        description={<p>{workspaceCount} {workspaceCount === 1 ? "workspace registrado" : "workspaces registrados"} desde la aplicación, con su plantilla de origen.</p>}
        actions={
          <>
            <WorkspacesPageClient />

            <Link
              href="/admin/users"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#FF5C35]/40 bg-white px-4 py-3 text-sm font-medium text-[#A53318] transition-colors hover:border-[#FF5C35] hover:bg-[#FFF1EC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5C35] motion-reduce:transition-none"
            >
              <LuUsers aria-hidden="true" className="size-4 shrink-0" />
              Gestionar usuarios
            </Link>
          </>
        }
      />

      <AdminWorkspacesContent page={workspacesPage} pageSizeOptions={[...WORKSPACE_PAGE_SIZES]} />
    </div>
  );
}