import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getHealth() {
    const db = await this.prisma.checkHealth();

    return {
      ok: true,
      service: "api",
      db
    };
  }
}
