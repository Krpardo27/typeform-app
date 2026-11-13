import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "./getCurrentUser";

export async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  if (user.globalRole !== "SUPER_ADMIN") notFound();
  return user;
}