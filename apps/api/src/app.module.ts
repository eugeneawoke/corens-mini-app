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
import { HomeController } from "./home.controller";
import { PrivacyController } from "./privacy.controller";
import { ProfilesService } from "./modules/profiles";
import { HomeService } from "./home.service";
import { BeaconService } from "./modules/beacon/service";
import { PolicyConfigService } from "./policy-config.service";
import { MatchingRuntimeService } from "./modules/matching/runtime.service";

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
    PrivacyController,
    BeaconController,
    MatchingController,
    ConsentsController
  ],
  providers: [
    PrismaService,
    BotWebhookService,
    MaintenanceService,
    HomeService,
    BeaconService,
    MatchingRuntimeService,
    PolicyConfigService,
    ProfilesService
  ],
  exports: [
    PrismaService,
    BotWebhookService,
    MaintenanceService,
    HomeService,
    BeaconService,
    MatchingRuntimeService,
    PolicyConfigService,
    ProfilesService
  ]
})
export class AppModule {}
