import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no está definida");
}

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
  prismaListenerAttached?: boolean;
};

type PrismaClientWithAuditLog = PrismaClient & {
  auditLog?: unknown;
};

type QueryEvent = {
  query: string;
  params: string;
  duration: number;
};

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });

  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "production"
      ? ["error", "warn"]
      : ["error", "warn", { emit: "event", level: "query" }],
  });

  if (process.env.NODE_ENV !== "production" && !globalForPrisma.prismaListenerAttached) {
    globalForPrisma.prismaListenerAttached = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client as any).$on("query", (e: QueryEvent) => {
      if (e.duration > 50) {
        console.warn(`[Prisma slow query ${e.duration}ms]\n  ${e.query}\n  params: ${e.params}`);
      } else {
        console.log(`[Prisma ${e.duration}ms] ${e.query}`);
      }
    });
  }

  return client;
}

const cachedPrisma = globalForPrisma.prisma as PrismaClientWithAuditLog | undefined;

export const prisma =
  cachedPrisma && cachedPrisma.auditLog ? cachedPrisma : createPrismaClient();

globalForPrisma.prisma = prisma;
