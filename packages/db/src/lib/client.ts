import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __corensPrismaClient: PrismaClient | undefined;
}

export function createDbClient(): PrismaClient {
  if (!global.__corensPrismaClient) {
    global.__corensPrismaClient = new PrismaClient();
  }

  return global.__corensPrismaClient;
}
