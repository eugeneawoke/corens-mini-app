import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import type { AuthBootstrapResponse } from "@corens/domain";
import { readAppEnv } from "@corens/config";
import { validateTelegramInitData } from "@corens/telegram";
import type { Profile, User } from "@corens/db";
import { PrismaService } from "../../prisma.service";
import { PrivacyRuntimeService } from "../privacy/runtime.service";
import { ProfilesService } from "../profiles";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export interface AuthenticatedUserContext {
  id: string;
  sessionId: string;
  telegramUserId: string;
  telegramUsername: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesService,
    private readonly privacy: PrivacyRuntimeService
  ) {}

  async bootstrap(rawInitData: string): Promise<AuthBootstrapResponse> {
    const env = readAppEnv();
    const validation = validateTelegramInitData(rawInitData, env.TELEGRAM_BOT_TOKEN, {
      maxAgeSeconds: 300
    });

    if (!validation.isValid || !validation.userId) {
      throw new UnauthorizedException(validation.reason ?? "invalid_init_data");
    }

    const existingUser = await this.prisma.clientInstance.user.findUnique({
      where: { telegramUserId: validation.userId }
    });

    if (existingUser?.status === "pending_deletion") {
      await this.privacy.hardDeleteByUserId(existingUser.id, {
        trackAggregateAnalytics: false
      });
    } else if (existingUser && existingUser.status !== "active") {
      throw new ForbiddenException("user_not_available");
    }

    const activeUser =
      existingUser?.status === "pending_deletion"
        ? null
        : existingUser;

    const user = activeUser
      ? await this.prisma.clientInstance.user.update({
          where: { id: activeUser.id },
          data: {
            telegramUsername: validation.username ?? activeUser.telegramUsername,
            status: "active"
          }
        })
      : await this.prisma.clientInstance.user.create({
          data: {
            telegramUserId: validation.userId,
            telegramUsername: validation.username ?? null,
            status: "active"
          }
        });

    await this.ensureProfile(user);

    const tokenSecret = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    const session = await this.prisma.clientInstance.session.create({
      data: {
        userId: user.id,
        tokenHash: this.hashTokenSecret(tokenSecret),
        expiresAt
      }
    });
    const sessionToken = `${session.id}.${tokenSecret}`;
    const profile = await this.profiles.getSummary(this.toContext(user));

    return {
      sessionToken,
      expiresAt: expiresAt.toISOString(),
      user: this.toPublicUser(user),
      profile
    };
  }

  async revoke(sessionToken: string): Promise<void> {
    const parsed = this.parseSessionToken(sessionToken);

    if (!parsed) {
      return;
    }

    await this.revokeSessionById(parsed.sessionId);
  }

  async revokeSessionById(sessionId: string): Promise<void> {
    await this.prisma.clientInstance.session.updateMany({
      where: {
        id: sessionId,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });
  }

  async authenticate(sessionToken: string): Promise<AuthenticatedUserContext> {
    const parsed = this.parseSessionToken(sessionToken);

    if (!parsed) {
      throw new UnauthorizedException("missing_session");
    }

    const session = await this.prisma.clientInstance.session.findUnique({
      where: { id: parsed.sessionId },
      include: { user: true }
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException("invalid_session");
    }

    const expected = Buffer.from(session.tokenHash, "hex");
    const actual = Buffer.from(this.hashTokenSecret(parsed.tokenSecret), "hex");

    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new UnauthorizedException("invalid_session");
    }

    if (session.user.status !== "active") {
      throw new ForbiddenException("user_not_available");
    }

    // Only extend the session when less than half its TTL remains —
    // avoids a write on every request for active users.
    const halfTtl = SESSION_TTL_MS / 2;
    if (session.expiresAt.getTime() - Date.now() < halfTtl) {
      await this.prisma.clientInstance.session.update({
        where: { id: session.id },
        data: {
          expiresAt: new Date(Date.now() + SESSION_TTL_MS)
        }
      });
    }

    return this.toContext(session.user, session.id);
  }

  private async ensureProfile(user: User): Promise<Profile> {
    const existingProfile = await this.prisma.clientInstance.profile.findUnique({
      where: { userId: user.id }
    });

    if (existingProfile) {
      return existingProfile;
    }

    return this.prisma.clientInstance.profile.create({
      data: {
        userId: user.id,
        displayName: user.telegramUsername ?? "Новый профиль",
        visibilityStatus: "active",
        matchingEnabled: true,
        stateKey: "calm",
        intentKey: "",
        trustKeys: [],
        onboardingCompleted: false
      }
    });
  }

  private hashTokenSecret(tokenSecret: string): string {
    const env = readAppEnv();
    return createHmac("sha256", env.SESSION_SECRET)
      .update(tokenSecret)
      .digest("hex");
  }

  private parseSessionToken(sessionToken: string): { sessionId: string; tokenSecret: string } | null {
    const [sessionId, tokenSecret] = sessionToken.split(".", 2);

    if (!sessionId || !tokenSecret) {
      return null;
    }

    return {
      sessionId,
      tokenSecret
    };
  }

  private toContext(user: User, sessionId = ""): AuthenticatedUserContext {
    return {
      id: user.id,
      sessionId,
      telegramUserId: user.telegramUserId,
      telegramUsername: user.telegramUsername
    };
  }

  private toPublicUser(user: User): AuthBootstrapResponse["user"] {
    return {
      id: user.id,
      telegramUserId: user.telegramUserId,
      telegramUsername: user.telegramUsername
    };
  }
}
