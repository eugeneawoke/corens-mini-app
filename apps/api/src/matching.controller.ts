import { Controller, Get, NotFoundException, Param, UseGuards } from "@nestjs/common";
import type { ConnectionSummary } from "@corens/domain";
import { AuthenticatedUser } from "./modules/auth/authenticated-user.decorator";
import type { AuthenticatedUserContext } from "./modules/auth/service";
import { SessionAuthGuard } from "./modules/auth/session.guard";
import { MatchingRuntimeService } from "./modules/matching/runtime.service";

@Controller("matching")
@UseGuards(SessionAuthGuard)
export class MatchingController {
  constructor(private readonly matching: MatchingRuntimeService) {}

  @Get("connections")
  async getConnections(
    @AuthenticatedUser() user: AuthenticatedUserContext
  ): Promise<ConnectionSummary[]> {
    return this.matching.getConnections(user);
  }

  @Get("connections/:id")
  async getConnectionById(
    @AuthenticatedUser() user: AuthenticatedUserContext,
    @Param("id") id: string
  ): Promise<ConnectionSummary> {
    const connection = await this.matching.getConnectionById(user, id);

    if (!connection) {
      throw new NotFoundException("Connection not found");
    }

    return connection;
  }
}
