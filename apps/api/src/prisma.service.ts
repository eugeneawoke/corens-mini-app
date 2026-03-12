import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { createDbClient } from "@corens/db";

@Injectable()
export class PrismaService implements OnModuleDestroy {
  private readonly client = createDbClient();

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
