import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  bmsPrisma?: PrismaClient | null;
};

export function getPrismaClient(): PrismaClient | null {
  if (globalForPrisma.bmsPrisma !== undefined) {
    return globalForPrisma.bmsPrisma;
  }

  const configuredUrl = getConfiguredDatabaseUrl();
  if (!configuredUrl) {
    globalForPrisma.bmsPrisma = null;
    return globalForPrisma.bmsPrisma;
  }

  process.env.DATABASE_URL = configuredUrl;

  try {
    globalForPrisma.bmsPrisma = new PrismaClient({
      errorFormat: process.env.NODE_ENV === "production" ? "minimal" : "colorless",
    });
  } catch {
    globalForPrisma.bmsPrisma = null;
  }

  return globalForPrisma.bmsPrisma;
}

export function getConfiguredDatabaseUrl() {
  return (
    process.env.DATABASE_URL ??
    process.env.MONGODB_URI ??
    process.env.MONGDODB_URI
  );
}
