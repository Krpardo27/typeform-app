import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/getCurrentUser";
import AdminMobileDock from "@/features/admin/components/AdminMobileDock";
import AdminWorkspacesNav from "@/features/admin/workspaces/components/AdminWorkspacesNav";
import { LogoutButton } from "@/shared/components/LogoutButton";
import GlobalSearchForm from "@/features/admin/components/GlobalSearchForm";
import { LuLayoutDashboard } from "react-icons/lu";
import { MobileUserIdentity } from "@/shared/components/MobileUserIdentity";

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

  const displayName = user.name?.trim() || user.email.split("@")[0].trim() || "Usuario";

  return (
    <div className="flex min-h-dvh bg-[#F5F5F5] text-[#171717]">
      <aside aria-label="Barra lateral de administración" className="hidden h-dvh w-72 shrink-0 flex-col border-r border-[#E5E5E5] bg-white px-4 py-5 lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex">
        <div className="shrink-0 border-b border-[#E5E5E5] px-3 pb-4">
          <div className="flex min-h-10 items-center gap-2.5 text-sm font-medium leading-5 text-[#171717]">
            <LuLayoutDashboard aria-hidden="true" className="size-4 shrink-0 text-[#FF5C35]" />
            Panel de administración
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-5">
          <AdminWorkspacesNav />
        </div>

        <div className="shrink-0 border-t border-[#E5E5E5] px-1 pt-4">
          <div className="mb-4 flex min-w-0 items-center gap-3">
            <div aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] text-sm font-semibold text-[#525252]">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p title={displayName} className="truncate text-sm font-semibold text-[#171717]">
                {displayName}
              </p>
              <p title={user.email} className="truncate text-sm leading-5 text-[#737373]">{user.email}</p>
            </div>
          </div>

          <LogoutButton variant="admin" />
        </div>
      </aside>

      <main className="min-w-0 flex-1 lg:pl-72">
        <div className="container mx-auto px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-10">
          <MobileUserIdentity user={user} />
          <section className="sticky top-0 z-20 mb-6 border-b border-[#E5E5E5] bg-[#F5F5F5] py-5 pb-4 md:static md:mb-8 md:border-b-0 md:bg-transparent md:pb-0">
            <div className="max-w-2xl">
              <GlobalSearchForm
                placeholder="Buscar usuarios autorizados o workspaces..."
                debounceMs={300}
                minLength={2}
              />
            </div>
          </section>

          {children}
        </div>
      </main>
      <AdminMobileDock />
    </div>
  );
}
