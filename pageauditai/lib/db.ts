import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaDatabaseUrl: string | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

function getPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL ?? "";
  const cached = globalForPrisma.prisma;
  const cachedUrl = globalForPrisma.prismaDatabaseUrl;

  if (cached && cachedUrl !== url) {
    void cached.$disconnect();
    globalForPrisma.prisma = undefined;
    globalForPrisma.prismaDatabaseUrl = undefined;
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
    globalForPrisma.prismaDatabaseUrl = url;
  }

  return globalForPrisma.prisma;
}

/**
 * Prisma singleton for Next.js. Recreates the client in dev if `DATABASE_URL`
 * changes (e.g. after adding `?schema=`) so auth does not keep an old connection.
 *
 * For Vercel/serverless, prefer a pooled connection string from your host
 * (e.g. Supabase "Transaction" pooler) so each invocation does not exhaust DB connections.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    const value = Reflect.get(client as object, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
}) as PrismaClient;
