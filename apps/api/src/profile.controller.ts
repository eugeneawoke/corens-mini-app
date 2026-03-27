import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
// Note: notifications/cleanup is intentionally GET (idempotent, called from server-side fetch)
import type {
  CompleteOnboardingRequest,
  UpdateAboutRequest,
  UpdateStateIntentRequest,
  UpdateTrustKeysRequest,
  UpdateGenderPreferenceRequest
} from "@corens/domain";
import { AuthenticatedUser } from "./modules/auth/authenticated-user.decorator";
import type { AuthenticatedUserContext } from "./modules/auth/service";
import { SessionAuthGuard } from "./modules/auth/session.guard";
import { ProfilesService } from "./modules/profiles";
import { BotNotificationService } from "./telegram/bot-notification.service";

@Controller("profile")
@UseGuards(SessionAuthGuard)
export class ProfileController {
  constructor(
    private readonly profiles: ProfilesService,
    private readonly notifications: BotNotificationService
  ) {}

  @Get("summary")
  async getSummary(@AuthenticatedUser() user: AuthenticatedUserContext) {
    void this.notifications.cleanupNotifications(user.telegramUserId);
    return this.profiles.getSummary(user);
  }

  @Get("notifications/cleanup")
  async cleanupNotifications(@AuthenticatedUser() user: AuthenticatedUserContext) {
    await this.notifications.cleanupNotifications(user.telegramUserId);
    return { ok: true };
  }

  @Patch("state-intent")
  updateStateIntent(
    @AuthenticatedUser() user: AuthenticatedUserContext,
    @Body() body: UpdateStateIntentRequest
  ) {
    return this.profiles.updateStateIntent(user, body);
  }

  @Patch("trust-keys")
  updateTrustKeys(
    @AuthenticatedUser() user: AuthenticatedUserContext,
    @Body() body: UpdateTrustKeysRequest
  ) {
    return this.profiles.updateTrustKeys(user, body);
  }

  @Patch("about")
  updateAbout(
    @AuthenticatedUser() user: AuthenticatedUserContext,
    @Body() body: UpdateAboutRequest
  ) {
    return this.profiles.updateAbout(user, body);
  }

  @Patch("gender-preference")
  updateGenderPreference(
    @AuthenticatedUser() user: AuthenticatedUserContext,
    @Body() body: UpdateGenderPreferenceRequest
  ) {
    return this.profiles.updateGenderPreference(user, body);
  }

  @Post("onboarding/start")
  markOnboardingStarted(@AuthenticatedUser() user: AuthenticatedUserContext) {
    return this.profiles.markOnboardingStarted(user);
  }

  @Post("onboarding")
  completeOnboarding(
    @AuthenticatedUser() user: AuthenticatedUserContext,
    @Body() body: CompleteOnboardingRequest
  ) {
    return this.profiles.completeOnboarding(user, body);
  }
}
