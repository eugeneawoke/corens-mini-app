import { Body, Controller, NotFoundException, Post, UseGuards } from "@nestjs/common";
import type { ModerationActionRequest } from "@corens/domain";
import { AuthenticatedUser } from "./modules/auth/authenticated-user.decorator";
import type { AuthenticatedUserContext } from "./modules/auth/service";
import { SessionAuthGuard } from "./modules/auth/session.guard";
import { ModerationRuntimeService } from "./modules/moderation/runtime.service";
import { parseModerationActionRequest } from "./request-validation";

@Controller("moderation")
@UseGuards(SessionAuthGuard)
export class ModerationController {
  constructor(private readonly moderation: ModerationRuntimeService) {}

  @Post("report")
  report(
    @AuthenticatedUser() user: AuthenticatedUserContext,
    @Body() body: unknown
  ) {
    const input = parseModerationActionRequest(body);

    if (!input.connectionId) {
      throw new NotFoundException("connectionId is required");
    }

    return this.moderation.report(user, input.connectionId, input.note);
  }

  @Post("block")
  block(
    @AuthenticatedUser() user: AuthenticatedUserContext,
    @Body() body: unknown
  ) {
    const input = parseModerationActionRequest(body);

    if (!input.connectionId) {
      throw new NotFoundException("connectionId is required");
    }

    return this.moderation.block(user, input.connectionId, input.note);
  }
}
