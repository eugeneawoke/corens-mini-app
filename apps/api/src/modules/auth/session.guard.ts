import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import type { Request } from "express";
import { AuthService, type AuthenticatedUserContext } from "./service";

type AuthenticatedRequest = Request & {
  authenticatedUser?: AuthenticatedUserContext;
};

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.readSessionToken(request);
    request.authenticatedUser = await this.auth.authenticate(token);
    return true;
  }

  private readSessionToken(request: Request): string {
    const authorization = request.headers.authorization;

    if (authorization?.startsWith("Bearer ")) {
      return authorization.slice("Bearer ".length).trim();
    }

    const cookieHeader = request.headers.cookie;

    if (!cookieHeader) {
      return "";
    }

    const cookie = cookieHeader
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith("corens_session="));

    return cookie ? decodeURIComponent(cookie.replace("corens_session=", "")) : "";
  }
}
