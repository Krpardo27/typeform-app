import { redirect } from "next/navigation";
import { LoginView } from "@/features/auth/components/LoginView";
import { getCurrentUser } from "@/lib/getCurrentUser";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user?.globalRole === "SUPER_ADMIN") {
    redirect("/admin/workspaces");
  }

  if (user) {
    redirect("/workspaces/me");
  }

  return <LoginView />;
}
