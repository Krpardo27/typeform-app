import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/getCurrentUser";
import AdminMobileDock from "@/features/admin/components/AdminMobileDock";
import AdminWorkspacesNav from "@/features/admin/workspaces/components/AdminWorkspacesNav";
import { LogoutButton } from "@/shared/components/LogoutButton";
import GlobalSearchForm from "@/features/admin/components/GlobalSearchForm";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (user.globalRole !== "SUPER_ADMIN") {
    redirect("/workspaces/me");
  }

  return (
    <div className="flex h-dvh min-h-dvh overflow-hidden bg-[#F5F5F5] text-[#171717]">
      <aside className="hidden h-dvh w-72 shrink-0 flex-col overflow-y-auto border-r border-[#E5E5E5] bg-[#FFFFFF] px-4 py-6 lg:flex">
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 rounded-lg border border-[#E5E5E5] bg-[#F5F5F5] px-3 py-2.5 text-sm font-medium text-[#171717]">
              <span className="flex size-7 items-center justify-center rounded-lg bg-[#18181B]/10 text-[#18181B]">
              <svg
                viewBox="0 0 24 24"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 12.5V7.5A2.5 2.5 0 0 1 6.5 5H17.5A2.5 2.5 0 0 1 20 7.5v5A2.5 2.5 0 0 1 17.5 15H9l-5 5v-7.5A2.5 2.5 0 0 1 4 12.5Z" />
              </svg>
            </span>
            Panel de administración
          </div>

          <AdminWorkspacesNav />
        </div>

        <div className="mt-auto border-t border-[#E5E5E5] px-1 pt-4">
          <div className="mb-4 flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#E5E5E5] bg-[#F5F5F5] text-sm font-bold text-[#18181B]">
              {user.name?.trim()?.charAt(0)?.toUpperCase() ||
                user.email.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#171717]">
                {user.name?.trim() || user.email.split("@")[0]}
              </p>
              <p className="truncate text-xs text-[#737373]">{user.email}</p>
            </div>
          </div>

          <LogoutButton variant="admin" />
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto px-4 pb-28 lg:pb-10">
        <section className="sticky top-0 z-20 mb-6 py-5 border-b border-[#E5E5E5] bg-[#F5F5F5] pb-4 md:static md:mb-8 md:border-b-0 md:bg-transparent md:pb-0">
          <div className="max-w-2xl">
            <GlobalSearchForm
              placeholder="Buscar usuarios autorizados o workspaces..."
              debounceMs={300}
              minLength={2}
            />
          </div>
        </section>

        {children}
      </main>
      <AdminMobileDock />
    </div>
  );
}
