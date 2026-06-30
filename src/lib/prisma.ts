import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no está definida");
}

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

type PrismaClientWithAuditLog = PrismaClient & {
  auditLog?: unknown;
};

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });

  return new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });
}

const cachedPrisma = globalForPrisma.prisma as PrismaClientWithAuditLog | undefined;

export const prisma =
  cachedPrisma && cachedPrisma.auditLog ? cachedPrisma : createPrismaClient();

globalForPrisma.prisma = prisma;
