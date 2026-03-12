import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthController } from "./health.controller";
import { PrismaService } from "./prisma.service";
import { BotWebhookService } from "./telegram/bot-webhook.service";
import { MaintenanceService } from "./maintenance/maintenance.service";
import { ProfileController } from "./profile.controller";
import { BeaconController } from "./beacon.controller";
import { MatchingController } from "./matching.controller";
import { ConsentsController } from "./consents.controller";
import { MvpDemoStoreService } from "./mvp-demo-store.service";
import { HomeController } from "./home.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true
    })
  ],
  controllers: [
    HealthController,
    HomeController,
    ProfileController,
    BeaconController,
    MatchingController,
    ConsentsController
  ],
  providers: [PrismaService, BotWebhookService, MaintenanceService, MvpDemoStoreService],
  exports: [PrismaService, BotWebhookService, MaintenanceService, MvpDemoStoreService]
})
export class AppModule {}
