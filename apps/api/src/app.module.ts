import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthController } from "./auth.controller";
import { HealthController } from "./health.controller";
import { PrismaService } from "./prisma.service";
import { BotWebhookService } from "./telegram/bot-webhook.service";
import { MaintenanceService } from "./maintenance/maintenance.service";
import { ProfileController } from "./profile.controller";
import { BeaconController } from "./beacon.controller";
import { MatchingController } from "./matching.controller";
import { ConsentsController } from "./consents.controller";
import { PrivacyController } from "./privacy.controller";
import { ModerationController } from "./moderation.controller";
import { MediaController } from "./media.controller";
import { ProfilesService } from "./modules/profiles";
import { BeaconService } from "./modules/beacon/service";
import { ConsentRuntimeService } from "./modules/consents/runtime.service";
import { MediaService } from "./modules/media/service";
import { ModerationRuntimeService } from "./modules/moderation/runtime.service";
import { PrivacyRuntimeService } from "./modules/privacy/runtime.service";
import { PolicyConfigService } from "./policy-config.service";
import { MatchingRuntimeService } from "./modules/matching/runtime.service";
import { AuthService } from "./modules/auth/service";
import { SessionAuthGuard } from "./modules/auth/session.guard";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true
    })
  ],
  controllers: [
    AuthController,
    HealthController,
    ProfileController,
    PrivacyController,
    ModerationController,
    BeaconController,
    MatchingController,
    ConsentsController,
    MediaController
  ],
  providers: [
    PrismaService,
    BotWebhookService,
    MaintenanceService,
    BeaconService,
    ConsentRuntimeService,
    MediaService,
    ModerationRuntimeService,
    PrivacyRuntimeService,
    MatchingRuntimeService,
    PolicyConfigService,
    ProfilesService,
    AuthService,
    SessionAuthGuard
  ],
  exports: [
    PrismaService,
    BotWebhookService,
    MaintenanceService,
    BeaconService,
    ConsentRuntimeService,
    MediaService,
    ModerationRuntimeService,
    PrivacyRuntimeService,
    MatchingRuntimeService,
    PolicyConfigService,
    ProfilesService,
    AuthService,
    SessionAuthGuard
  ]
})
export class AppModule {}
