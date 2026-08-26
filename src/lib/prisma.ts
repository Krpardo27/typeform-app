import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const missingDatabaseMessage =
  "DATABASE_URL no está definida. La app arrancó en modo sin base de datos. Configura la variable para usar endpoints que dependan de Prisma.";

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

function createMissingDatabaseClient(): PrismaClient {
  console.warn(`[Prisma] ${missingDatabaseMessage}`);

  return new Proxy({} as PrismaClient, {
    get(_target, prop) {
      if (prop === "$on") {
        return () => undefined;
      }

      if (prop === "$disconnect") {
        return async () => undefined;
      }

      if (prop === "$use") {
        return () => undefined;
      }

      if (prop === "$extends") {
        return () => ({}) as PrismaClient;
      }

      throw new Error(missingDatabaseMessage);
    },
  });
}

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    return createMissingDatabaseClient();
  }

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });

  const client = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "production"
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

export const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);
