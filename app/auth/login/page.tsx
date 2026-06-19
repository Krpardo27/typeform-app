import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { LoginView } from "@/features/auth/components/LoginView";
import { auth } from "@/lib/auth";

export default async function LoginPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/workspaces");
  }

  return <LoginView />;
}
