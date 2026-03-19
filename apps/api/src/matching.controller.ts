import { Controller, Get, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import type { ConnectionSummary } from "@corens/domain";
import { AuthenticatedUser } from "./modules/auth/authenticated-user.decorator";
import type { AuthenticatedUserContext } from "./modules/auth/service";
import { SessionAuthGuard } from "./modules/auth/session.guard";
import { MatchingRuntimeService } from "./modules/matching/runtime.service";

@Controller("matching")
@UseGuards(SessionAuthGuard)
export class MatchingController {
  constructor(private readonly matching: MatchingRuntimeService) {}

  @Get("current-connection")
  async getCurrentConnection(
    @AuthenticatedUser() user: AuthenticatedUserContext,
    @Res() response: Response
  ): Promise<void> {
    const connection = await this.matching.getCurrentConnection(user);

    this.sendJson(response, connection);
  }

  private sendJson(response: Response, payload: ConnectionSummary | null): void {
    response.type("application/json");
    response.send(JSON.stringify(payload));
  }
}
