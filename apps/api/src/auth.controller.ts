import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedUser } from "./modules/auth/authenticated-user.decorator";
import { AuthService } from "./modules/auth/service";
import type { AuthenticatedUserContext } from "./modules/auth/service";
import { SessionAuthGuard } from "./modules/auth/session.guard";
import { parseAuthBootstrapRequest } from "./request-validation";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("bootstrap")
  bootstrap(@Body() body: unknown) {
    const input = parseAuthBootstrapRequest(body);
    return this.auth.bootstrap(input.initData);
  }

  @Post("revoke")
  @HttpCode(204)
  @UseGuards(SessionAuthGuard)
  async revoke(@AuthenticatedUser() user: AuthenticatedUserContext): Promise<void> {
    await this.auth.revokeSessionById(user.sessionId);
  }
}
