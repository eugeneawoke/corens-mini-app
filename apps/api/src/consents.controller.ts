import { Body, Controller, Get, NotFoundException, Param, Post, Query, UseGuards } from "@nestjs/common";
import type { ConsentChannel, ConsentDecisionRequest } from "@corens/domain";
import { AuthenticatedUser } from "./modules/auth/authenticated-user.decorator";
import type { AuthenticatedUserContext } from "./modules/auth/service";
import { SessionAuthGuard } from "./modules/auth/session.guard";
import { ConsentRuntimeService } from "./modules/consents/runtime.service";
import { parseConsentDecisionRequest } from "./request-validation";

@Controller("consents")
@UseGuards(SessionAuthGuard)
export class ConsentsController {
  constructor(private readonly consents: ConsentRuntimeService) {}

  @Get(":channel")
  getStatus(
    @AuthenticatedUser() user: AuthenticatedUserContext,
    @Param("channel") channel: ConsentChannel,
    @Query("connectionId") connectionId: string
  ) {
    if (!connectionId) {
      throw new NotFoundException("connectionId is required");
    }

    return this.consents.getStatus(user, channel, connectionId);
  }

  @Post(":channel")
  updateStatus(
    @AuthenticatedUser() user: AuthenticatedUserContext,
    @Param("channel") channel: ConsentChannel,
    @Body() body: unknown,
    @Query("connectionId") connectionId: string
  ) {
    const input = parseConsentDecisionRequest(body);

    if (!input.decision) {
      throw new NotFoundException("Consent status is unavailable");
    }

    if (!connectionId) {
      throw new NotFoundException("connectionId is required");
    }

    return this.consents.updateStatus(user, channel, input.decision, connectionId);
  }
}
