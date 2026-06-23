import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/getCurrentUser";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (user.globalRole === "SUPER_ADMIN") {
    redirect("/admin/workspaces");
  }

  redirect("/workspaces/me");
}