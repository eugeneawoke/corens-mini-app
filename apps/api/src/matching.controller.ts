import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuthenticatedUser } from "./modules/auth/authenticated-user.decorator";
import type { AuthenticatedUserContext } from "./modules/auth/service";
import { SessionAuthGuard } from "./modules/auth/session.guard";
import { MatchingRuntimeService } from "./modules/matching/runtime.service";

@Controller("matching")
@UseGuards(SessionAuthGuard)
export class MatchingController {
  constructor(private readonly matching: MatchingRuntimeService) {}

  @Get("current-connection")
  getCurrentConnection(@AuthenticatedUser() user: AuthenticatedUserContext) {
    return this.matching.getCurrentConnection(user);
  }
}
