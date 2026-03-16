import { Injectable } from "@nestjs/common";
import type { HomeSummary } from "@corens/domain";
import { BeaconService } from "./modules/beacon/service";
import { ProfilesService } from "./modules/profiles";

@Injectable()
export class HomeService {
  constructor(
    private readonly profiles: ProfilesService,
    private readonly beacon: BeaconService
  ) {}

  async getSummary(): Promise<HomeSummary> {
    const profile = await this.profiles.getSummary();
    const beacon = await this.beacon.getSummary();

    return {
      onboardingCompleted: profile.onboardingCompleted,
      profile: profile.profile,
      state: profile.state.current,
      intent: profile.intent.current,
      beacon,
      connection: null
    };
  }
}
