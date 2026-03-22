import { PrismaClient } from "@prisma/client";

declare global {
  var __codeAtlasPrisma__: PrismaClient | undefined;
}

export const prisma =
  globalThis.__codeAtlasPrisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__codeAtlasPrisma__ = prisma;
}
