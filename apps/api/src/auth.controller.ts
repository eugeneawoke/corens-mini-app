import { Body, Controller, Headers, HttpCode, Post, UseGuards } from "@nestjs/common";
import type { AuthBootstrapRequest } from "@corens/domain";
import { AuthService } from "./modules/auth/service";
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
  async revoke(@Headers("authorization") authorization?: string): Promise<void> {
    const sessionToken = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : "";

    await this.auth.revoke(sessionToken);
  }
}
