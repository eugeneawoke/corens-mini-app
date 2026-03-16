import { Body, Controller, Get, Patch, Post } from "@nestjs/common";
import type {
  CompleteOnboardingRequest,
  UpdateStateIntentRequest,
  UpdateTrustKeysRequest
} from "@corens/domain";
import { ProfilesService } from "./modules/profiles";

@Controller("profile")
export class ProfileController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get("summary")
  getSummary() {
    return this.profiles.getSummary();
  }

  @Patch("state-intent")
  updateStateIntent(@Body() body: UpdateStateIntentRequest) {
    return this.profiles.updateStateIntent(body);
  }

  @Patch("trust-keys")
  updateTrustKeys(@Body() body: UpdateTrustKeysRequest) {
    return this.profiles.updateTrustKeys(body);
  }

  @Post("onboarding")
  completeOnboarding(@Body() body: CompleteOnboardingRequest) {
    return this.profiles.completeOnboarding(body);
  }
}
