import { Body, Controller, Get, Patch } from "@nestjs/common";
import type { UpdateStateIntentRequest, UpdateTrustKeysRequest } from "@corens/domain";
import { MvpDemoStoreService } from "./mvp-demo-store.service";

@Controller("profile")
export class ProfileController {
  constructor(private readonly store: MvpDemoStoreService) {}

  @Get("summary")
  getSummary() {
    return this.store.getProfileSummary();
  }

  @Patch("state-intent")
  updateStateIntent(@Body() body: UpdateStateIntentRequest) {
    return this.store.updateStateIntent(body);
  }

  @Patch("trust-keys")
  updateTrustKeys(@Body() body: UpdateTrustKeysRequest) {
    return this.store.updateTrustKeys(body);
  }
}
