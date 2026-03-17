import { describe, expect, it, beforeEach } from "vitest";
import type { Profile, Session, User } from "@corens/db";
import { AuthService } from "../../apps/api/src/modules/auth/service";
import type { ProfilesService } from "../../apps/api/src/modules/profiles";
import type { PrismaService } from "../../apps/api/src/prisma.service";
import { createTelegramInitData } from "../helpers/telegram-init-data";

type SessionRecord = Session & {
  user: User;
};

function createAuthServiceFixture() {
  const users: User[] = [];
  const profiles: Profile[] = [];
  const sessions: SessionRecord[] = [];

  const prisma = {
    clientInstance: {
      user: {
        findUnique: async ({ where }: { where: { telegramUserId?: string; id?: string } }) =>
          users.find((user) =>
            where.id ? user.id === where.id : user.telegramUserId === where.telegramUserId
          ) ?? null,
        update: async ({ where, data }: { where: { id: string }; data: Partial<User> }) => {
          const user = users.find((item) => item.id === where.id)!;
          Object.assign(user, data);
          return user;
        },
        create: async ({ data }: { data: Pick<User, "telegramUserId" | "telegramUsername" | "status"> }) => {
          const user: User = {
            id: `user-${users.length + 1}`,
            firstSeenAt: new Date(),
            lastSeenAt: new Date(),
            profile: null,
            ...data
          };
          users.push(user);
          return user;
        }
      },
      profile: {
        findUnique: async ({ where }: { where: { userId: string } }) =>
          profiles.find((profile) => profile.userId === where.userId) ?? null,
        create: async ({ data }: { data: Omit<Profile, "createdAt" | "updatedAt" | "photoCount" | "about"> & { about?: string | null; photoCount?: number } }) => {
          const profile: Profile = {
            about: null,
            createdAt: new Date(),
            photoCount: 0,
            updatedAt: new Date(),
            ...data
          };
          profiles.push(profile);
          return profile;
        }
      },
      session: {
        create: async ({ data }: { data: Pick<Session, "userId" | "tokenHash" | "expiresAt"> }) => {
          const session: SessionRecord = {
            id: `session-${sessions.length + 1}`,
            createdAt: new Date(),
            lastSeenAt: new Date(),
            revokedAt: null,
            ...data,
            user: users.find((user) => user.id === data.userId)!
          };
          sessions.push(session);
          return session;
        },
        findUnique: async ({ where }: { where: { id: string } }) =>
          sessions.find((session) => session.id === where.id) ?? null,
        update: async ({ where, data }: { where: { id: string }; data: Partial<Session> }) => {
          const session = sessions.find((item) => item.id === where.id)!;
          Object.assign(session, data);
          return session;
        },
        updateMany: async ({ where, data }: { where: { id?: string; revokedAt?: null; userId?: string }; data: Partial<Session> }) => {
          const matched = sessions.filter((session) => {
            if (where.id && session.id !== where.id) {
              return false;
            }

            if (where.userId && session.userId !== where.userId) {
              return false;
            }

            if (where.revokedAt === null && session.revokedAt !== null) {
              return false;
            }

            return true;
          });

          matched.forEach((session) => Object.assign(session, data));
          return { count: matched.length };
        }
      }
    }
  } as unknown as PrismaService;

  const profilesService = {
    getSummary: async () => ({
      onboardingCompleted: false,
      profile: {
        displayName: "Новый профиль",
        handle: "@corens_user"
      },
      state: {
        current: { key: "calm", label: "Спокойствие", description: "..." },
        options: [],
        cooldownLabel: "later"
      },
      intent: {
        current: { key: "slow-dialogue", label: "Медленный диалог", description: "..." },
        options: []
      },
      trustKeys: {
        selected: [],
        groups: [],
        limitLabel: "0",
        cooldownLabel: "later"
      },
      privacy: {
        visibility: {
          userId: "user-1",
          isHidden: false,
          matchingEnabled: true
        },
        privacyCopy: "",
        switches: [],
        deletionPlan: {
          nextVisibility: {
            userId: "user-1",
            isHidden: true,
            matchingEnabled: false
          },
          stages: [],
          sideEffects: []
        }
      }
    })
  } as unknown as ProfilesService;

  return {
    auth: new AuthService(prisma, profilesService),
    sessions,
    users
  };
}

describe("AuthService", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
    process.env.APP_ENV = "test";
    process.env.APP_NAME = "corens-mini-app";
    process.env.API_PORT = "4000";
    process.env.BOT_PORT = "4100";
    process.env.WORKER_PORT = "4200";
    process.env.TELEGRAM_BOT_TOKEN = "telegram-bot-token";
    process.env.TELEGRAM_BOT_WEBHOOK_SECRET = "secret";
    process.env.TELEGRAM_BOT_USERNAME = "corens_bot";
    process.env.TELEGRAM_MINI_APP_URL = "https://example.com";
    process.env.DATABASE_URL = "postgres://localhost/corens";
    process.env.DATABASE_URL_UNPOOLED = "postgres://localhost/corens";
    process.env.REDIS_URL = "redis://localhost:6379";
    process.env.SESSION_SECRET = "session-secret";
  });

  it("bootstraps a session from validated Telegram init data", async () => {
    const fixture = createAuthServiceFixture();
    const rawInitData = createTelegramInitData({
      botToken: process.env.TELEGRAM_BOT_TOKEN!,
      user: {
        id: 42,
        username: "corens_user"
      }
    });

    const result = await fixture.auth.bootstrap(rawInitData);

    expect(result.user.telegramUserId).toBe("42");
    expect(result.sessionToken).toContain(".");
    expect(fixture.sessions).toHaveLength(1);
    expect(fixture.users).toHaveLength(1);
  });

  it("revokes an issued session", async () => {
    const fixture = createAuthServiceFixture();
    const rawInitData = createTelegramInitData({
      botToken: process.env.TELEGRAM_BOT_TOKEN!,
      user: {
        id: 42
      }
    });

    const result = await fixture.auth.bootstrap(rawInitData);
    await fixture.auth.revoke(result.sessionToken);

    await expect(fixture.auth.authenticate(result.sessionToken)).rejects.toThrow("invalid_session");
  });
});
