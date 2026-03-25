import { Body, Controller, NotFoundException, Post, UseGuards } from "@nestjs/common";
import type { ModerationActionRequest } from "@corens/domain";
import { AuthenticatedUser } from "./modules/auth/authenticated-user.decorator";
import type { AuthenticatedUserContext } from "./modules/auth/service";
import { SessionAuthGuard } from "./modules/auth/session.guard";
import { ModerationRuntimeService } from "./modules/moderation/runtime.service";

@Controller("moderation")
@UseGuards(SessionAuthGuard)
export class ModerationController {
  constructor(private readonly moderation: ModerationRuntimeService) {}

  @Post("report")
  report(
    @AuthenticatedUser() user: AuthenticatedUserContext,
    @Body() body: ModerationActionRequest
  ) {
    if (!body?.connectionId) {
      throw new NotFoundException("connectionId is required");
    }

    return this.moderation.report(user, body.connectionId, body.note);
  }

  @Post("block")
  block(
    @AuthenticatedUser() user: AuthenticatedUserContext,
    @Body() body: ModerationActionRequest
  ) {
    if (!body?.connectionId) {
      throw new NotFoundException("connectionId is required");
    }

    return this.moderation.block(user, body.connectionId, body.note);
  }
}
