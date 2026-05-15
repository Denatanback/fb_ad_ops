import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });
}

function hasRequiredModels(client: PrismaClient | undefined) {
  if (!client) {
    return false;
  }

  const candidate = client as unknown as Record<string, unknown>;

  return ["user", "approach", "creative", "launchPlan"].every((key) => key in candidate);
}

const cachedClient = globalThis.prisma;

if (cachedClient && !hasRequiredModels(cachedClient)) {
  void cachedClient.$disconnect().catch(() => undefined);
  globalThis.prisma = undefined;
}

export const db = hasRequiredModels(globalThis.prisma) ? globalThis.prisma! : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = db;
}
