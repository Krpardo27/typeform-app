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
    <div className="flex h-dvh min-h-dvh bg-[#0b0b0d] text-zinc-100">
      <div className="hidden w-72 flex-col border-r border-zinc-800 bg-[#0f0f0f] lg:flex">
        <AdminWorkspacesNav />
        <div className="mt-auto border-t border-zinc-800 p-4">
          <LogoutButton />
        </div>
      </div>
      <main className="flex-1 overflow-y-auto px-4 pb-28 pt-6 md:px-8 lg:px-10 lg:py-8">
        <section className="mb-6 border-b border-zinc-800/70 pb-4 lg:mb-8 lg:pb-5">
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
