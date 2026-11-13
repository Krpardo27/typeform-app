import { createHmac } from "node:crypto";
import { performance } from "node:perf_hooks";
import { loadEnvConfig } from "@next/env";

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.floor(sorted.length / 2)]) / 2;
}

async function main() {
  loadEnvConfig(process.cwd());
  const origin = new URL(process.argv[2] ?? "http://localhost:3100");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)) {
    throw new Error("La medición autenticada solo admite loopback");
  }
  const authenticated = process.argv.includes("--authenticated");
  const headers = new Headers({ "accept-encoding": "gzip" });
  let role: string | undefined;
  const { prisma } = await import("../src/lib/prisma");
  try {
    if (authenticated) {
      const { auth } = await import("../src/lib/auth");
      const context = await auth.$context;
      const session = await prisma.session.findFirst({
        where: { expiresAt: { gt: new Date() }, user: { status: { not: "REJECTED" }, globalRole: "SUPER_ADMIN" } },
        orderBy: { updatedAt: "desc" },
        select: { token: true, user: { select: { globalRole: true } } },
      });
      if (!session) throw new Error("Se necesita una sesión administrativa vigente");
      role = session.user.globalRole;
      const sign = (value: string) => encodeURIComponent(`${value}.${createHmac("sha256", context.secret).update(value).digest("base64")}`);
      // dontRemember evita renovar la sesión de referencia durante estas lecturas.
      headers.set("cookie", `${context.authCookies.sessionToken.name}=${sign(session.token)}; ${context.authCookies.dontRememberToken.name}=${sign("true")}`);
    }
    const results = [];
    for (const path of ["/", "/auth/login", "/admin/dashboard", "/workspaces/me"]) {
      const samples = [];
      for (let i = 0; i < 11; i++) {
        const start = performance.now();
        const response = await fetch(new URL(path, origin), { headers, redirect: "manual" });
        const ttfbMs = performance.now() - start;
        await response.arrayBuffer();
        samples.push({ ttfbMs, totalMs: performance.now() - start, status: response.status,
          location: response.headers.get("location"), encoding: response.headers.get("content-encoding") });
      }
      results.push({ path, cold: samples[0], warmMedian: {
        ttfbMs: median(samples.slice(1).map((sample) => sample.ttfbMs)),
        totalMs: median(samples.slice(1).map((sample) => sample.totalMs)),
      }, status: samples[10].status, location: samples[10].location, encoding: samples[10].encoding });
    }
    console.log(JSON.stringify({ authenticated, role, samples: 10, followsRedirects: false, results }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error("No se pudo completar la medición HTTP local; revisar servidor, sesión y configuración.");
  process.exitCode = 1;
});