import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { AuthenticatedUserContext } from "./service";

export const AuthenticatedUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUserContext => {
    const request = context.switchToHttp().getRequest<Request & {
      authenticatedUser?: AuthenticatedUserContext;
    }>();

    if (!request.authenticatedUser) {
      throw new Error("Authenticated user context is unavailable");
    }

    return request.authenticatedUser;
  }
);
