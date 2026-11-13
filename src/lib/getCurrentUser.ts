import { cache } from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Memoizado por petición: layout, página y servicios comparten la misma consulta.
export const getCurrentUser = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });

  if (!session || session.user.status === "REJECTED") return null;

  const { id, email, name, globalRole } = session.user;
  return { id, email, name, globalRole };
});
