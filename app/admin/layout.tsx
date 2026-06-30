import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/getCurrentUser";
import AdminWorkspacesNav from "@/features/admin/workspaces/components/AdminWorkspacesNav";
import { LogoutButton } from "@/shared/components/LogoutButton";

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
    <div className="flex h-dvh bg-[#0b0b0d] text-zinc-100">
      <div className="flex w-72 flex-col border-r border-zinc-800 bg-[#0f0f0f]">
        <AdminWorkspacesNav />
        <div className="mt-auto border-t border-zinc-800 p-4">
          <LogoutButton />
        </div>
      </div>
      <main className="flex-1 overflow-y-auto px-10 py-8">{children}</main>
    </div>
  );
}
