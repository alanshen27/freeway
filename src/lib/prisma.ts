import { Prisma, PrismaClient } from "@prisma/client";

/**
 * Connection-level Prisma errors worth retrying — the query never ran (or the
 * connection died), typically a Supabase pooler blip or a network drop. A long
 * course-generation job makes thousands of queries; one blip must not kill it.
 * - P1001 can't reach database server
 * - P1002 database server reached but timed out
 * - P1017 server has closed the connection
 * - P2024 timed out fetching a connection from the pool
 */
const TRANSIENT_CODES = new Set(["P1001", "P1002", "P1017", "P2024"]);

function isTransientError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return TRANSIENT_CODES.has(err.code);
  }
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return err.errorCode === undefined || TRANSIENT_CODES.has(err.errorCode);
  }
  return false;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  }).$extends({
    query: {
      async $allOperations({ query, args }) {
        let delayMs = 1_000;
        for (let attempt = 1; ; attempt++) {
          try {
            return await query(args);
          } catch (err) {
            if (attempt >= 4 || !isTransientError(err)) throw err;
            await sleep(delayMs + Math.random() * 500);
            delayMs *= 3; // ~1s, ~3s, ~9s before giving up
          }
        }
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
