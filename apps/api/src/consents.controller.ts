import { Body, Controller, Get, NotFoundException, Param, Post } from "@nestjs/common";
import type { ConsentChannel, ConsentDecisionRequest } from "@corens/domain";
import { MvpDemoStoreService } from "./mvp-demo-store.service";

@Controller("consents")
export class ConsentsController {
  constructor(private readonly store: MvpDemoStoreService) {}

  @Get(":channel")
  getStatus(@Param("channel") channel: ConsentChannel) {
    const status = this.store.getConsentStatus(channel);

    if (!status) {
      throw new NotFoundException("Consent status is unavailable");
    }

    return status;
  }

  @Post(":channel")
  updateStatus(
    @Param("channel") channel: ConsentChannel,
    @Body() body: ConsentDecisionRequest
  ) {
    const status = this.store.updateConsent(channel, body.decision);

    if (!status) {
      throw new NotFoundException("Consent status is unavailable");
    }

    return status;
  }
}
