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
import { ModerationController } from "./moderation.controller";
import { ProfilesService } from "./modules/profiles";
import { HomeService } from "./home.service";
import { BeaconService } from "./modules/beacon/service";
import { ConsentRuntimeService } from "./modules/consents/runtime.service";
import { ModerationRuntimeService } from "./modules/moderation/runtime.service";
import { PrivacyRuntimeService } from "./modules/privacy/runtime.service";
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
    ModerationController,
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
    ConsentRuntimeService,
    ModerationRuntimeService,
    PrivacyRuntimeService,
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
    ConsentRuntimeService,
    ModerationRuntimeService,
    PrivacyRuntimeService,
    MatchingRuntimeService,
    PolicyConfigService,
    ProfilesService
  ]
})
export class AppModule {}
