import { createHmac } from "node:crypto";
import { performance } from "node:perf_hooks";
import { loadEnvConfig } from "@next/env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.floor(sorted.length / 2)]) / 2;
}

async function main() {
  loadEnvConfig(process.cwd());
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no configurada");

  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    log: [{ emit: "event", level: "query" }],
  });
  let queryCount = 0;
  let sqlMs = 0;
  db.$on("query", (event) => {
    queryCount++;
    sqlMs += event.duration;
  });

  try {
    const { auth } = await import("../src/lib/auth");
    const measuredAuth = betterAuth({
      ...auth.options,
      database: prismaAdapter(db, { provider: "postgresql" }),
    });
    const context = await measuredAuth.$context;
    queryCount = 0;
    const anonymousStart = performance.now();
    const anonymous = await measuredAuth.api.getSession({ headers: new Headers() });
    const anonymousSession = { elapsedMs: performance.now() - anonymousStart, queries: queryCount, authenticated: Boolean(anonymous) };
    // Solo reutiliza una sesión vigente para lecturas; nunca emite cookies ni renueva sesiones.
    const session = await db.session.findFirst({
      where: { expiresAt: { gt: new Date() }, user: { status: { not: "REJECTED" } } },
      orderBy: { createdAt: "desc" },
      select: { token: true },
    });
    if (!session) {
      console.log(JSON.stringify({ skipped: "No hay sesiones vigentes para medir" }));
      return;
    }
    const signature = createHmac("sha256", context.secret).update(session.token).digest("base64");
    const headers = new Headers({
      cookie: `${context.authCookies.sessionToken.name}=${encodeURIComponent(`${session.token}.${signature}`)}`,
    });
    const samples: Array<{ sessionMs: number; sessionQueries: number; sessionSqlMs: number; extraUserMs: number }> = [];
    for (let i = 0; i < 11; i++) {
      queryCount = 0;
      sqlMs = 0;
      const start = performance.now();
      const result = await measuredAuth.api.getSession({
        headers,
        query: { disableCookieCache: true, disableRefresh: true },
      });
      const sessionMs = performance.now() - start;
      if (!result) throw new Error("La sesión de referencia no es válida");
      const sessionQueries = queryCount;
      const sessionSqlMs = sqlMs;
      const userStart = performance.now();
      const user = await db.user.findUnique({
        where: { id: result.user.id },
        select: { id: true, email: true, name: true, globalRole: true },
      });
      if (result.user.globalRole !== user?.globalRole) {
        throw new Error("El rol de sesión no coincide con la base de datos");
      }
      samples.push({ sessionMs, sessionQueries, sessionSqlMs, extraUserMs: performance.now() - userStart });
    }
    console.log(JSON.stringify({
      samples: 10,
      anonymousSession,
      cold: samples[0],
      warmMedian: Object.fromEntries(
        Object.keys(samples[0]).map((key) => [key, median(samples.slice(1).map((s) => s[key as keyof typeof s]))]),
      ),
    }, null, 2));
  } finally {
    await db.$disconnect();
    const { prisma } = await import("../src/lib/prisma");
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error("No se pudo completar la medición de autenticación; revisar conectividad y configuración.");
  process.exitCode = 1;
});