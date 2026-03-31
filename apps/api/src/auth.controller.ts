import { Body, Controller, Get, HttpCode, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedUser } from "./modules/auth/authenticated-user.decorator";
import { AuthService } from "./modules/auth/service";
import type { AuthenticatedUserContext } from "./modules/auth/service";
import { SessionAuthGuard } from "./modules/auth/session.guard";
import { parseAuthBootstrapRequest } from "./request-validation";
import { BotNotificationService } from "./telegram/bot-notification.service";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly notifications: BotNotificationService
  ) {}

  @Post("bootstrap")
  async bootstrap(@Body() body: unknown) {
    const input = parseAuthBootstrapRequest(body);
    const response = await this.auth.bootstrap(input.initData);

    try {
      await this.notifications.cleanupNotifications(response.user.telegramUserId);
    } catch {
      // Best-effort: notification cleanup must not block session bootstrap.
    }

    return response;
  }

  @Get("session")
  @UseGuards(SessionAuthGuard)
  getSession(@AuthenticatedUser() user: AuthenticatedUserContext) {
    return {
      user: {
        id: user.id,
        telegramUserId: user.telegramUserId,
        telegramUsername: user.telegramUsername
      }
    };
  }

  @Post("revoke")
  @HttpCode(204)
  @UseGuards(SessionAuthGuard)
  async revoke(@AuthenticatedUser() user: AuthenticatedUserContext): Promise<void> {
    await this.auth.revokeSessionById(user.sessionId);
  }
}
