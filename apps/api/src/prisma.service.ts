import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { createDbClient, type PrismaClient } from "@corens/db";

@Injectable()
export class PrismaService implements OnModuleDestroy {
  private readonly client = createDbClient();

  get clientInstance(): PrismaClient {
    return this.client;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }

  async checkHealth(): Promise<"up" | "down"> {
    try {
      await this.client.$queryRaw`SELECT 1`;
      return "up";
    } catch {
      return "down";
    }
  }
}
