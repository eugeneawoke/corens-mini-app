import { Body, Controller, Get, NotFoundException, Param, Post, UseGuards } from "@nestjs/common";
import type { ConsentChannel, ConsentDecisionRequest } from "@corens/domain";
import { AuthenticatedUser } from "./modules/auth/authenticated-user.decorator";
import type { AuthenticatedUserContext } from "./modules/auth/service";
import { SessionAuthGuard } from "./modules/auth/session.guard";
import { ConsentRuntimeService } from "./modules/consents/runtime.service";

@Controller("consents")
@UseGuards(SessionAuthGuard)
export class ConsentsController {
  constructor(private readonly consents: ConsentRuntimeService) {}

  @Get(":channel")
  getStatus(
    @AuthenticatedUser() user: AuthenticatedUserContext,
    @Param("channel") channel: ConsentChannel
  ) {
    const status = this.consents.getStatus(user, channel);

    return status;
  }

  @Post(":channel")
  updateStatus(
    @AuthenticatedUser() user: AuthenticatedUserContext,
    @Param("channel") channel: ConsentChannel,
    @Body() body: ConsentDecisionRequest
  ) {
    if (!body?.decision) {
      throw new NotFoundException("Consent status is unavailable");
    }

    return this.consents.updateStatus(user, channel, body.decision);
  }
}
