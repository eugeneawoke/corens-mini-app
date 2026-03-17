import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import type { AuthBootstrapRequest } from "@corens/domain";
import { AuthenticatedUser } from "./modules/auth/authenticated-user.decorator";
import { AuthService } from "./modules/auth/service";
import type { AuthenticatedUserContext } from "./modules/auth/service";
import { SessionAuthGuard } from "./modules/auth/session.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("bootstrap")
  bootstrap(@Body() body: AuthBootstrapRequest) {
    return this.auth.bootstrap(body.initData);
  }

  @Post("revoke")
  @HttpCode(204)
  @UseGuards(SessionAuthGuard)
  async revoke(@AuthenticatedUser() user: AuthenticatedUserContext): Promise<void> {
    await this.auth.revokeSessionById(user.sessionId);
  }
}
