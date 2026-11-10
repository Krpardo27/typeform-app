import { cache } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

// Memoizado por petición: layout, página y servicios comparten la misma consulta.
export const getCurrentUser = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      globalRole: true,
    },
  });
  return user;
});
