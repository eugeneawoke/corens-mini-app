import { Body, Controller, Get, NotFoundException, Param, Post } from "@nestjs/common";
import type { ConsentChannel, ConsentDecisionRequest } from "@corens/domain";
import { ConsentRuntimeService } from "./modules/consents/runtime.service";

@Controller("consents")
export class ConsentsController {
  constructor(private readonly consents: ConsentRuntimeService) {}

  @Get(":channel")
  getStatus(@Param("channel") channel: ConsentChannel) {
    const status = this.consents.getStatus(channel);

    return status;
  }

  @Post(":channel")
  updateStatus(
    @Param("channel") channel: ConsentChannel,
    @Body() body: ConsentDecisionRequest
  ) {
    if (!body?.decision) {
      throw new NotFoundException("Consent status is unavailable");
    }

    return this.consents.updateStatus(channel, body.decision);
  }
}
