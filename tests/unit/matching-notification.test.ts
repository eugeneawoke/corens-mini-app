import { beforeEach, describe, expect, it, vi } from "vitest";
import { MatchingRuntimeService } from "../../apps/api/src/modules/matching/runtime.service";
import { BotNotificationService } from "../../apps/api/src/telegram/bot-notification.service";
import type { PrismaService } from "../../apps/api/src/prisma.service";

function matchingProfile(
  userId: string,
  displayName: string,
  telegramUserId: string,
  gender: string
) {
  return {
    userId,
    displayName,
    gender,
    partnerGender: "opposite",
    stateKey: "calm",
    intentKey: "talk",
    trustKeys: ["honesty"],
    matchingEnabled: true,
    visibilityStatus: "active",
    onboardingCompleted: true,
    updatedAt: new Date("2026-08-24T08:00:00.000Z"),
    user: { telegramUserId }
  };
}

describe("new-match Telegram notification", () => {
  beforeEach(() => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "123456:test-token");
    vi.stubEnv("TELEGRAM_BOT_WEBHOOK_SECRET", "webhook-secret");
    vi.stubEnv("TELEGRAM_BOT_USERNAME", "corens_test_bot");
    vi.stubEnv("TELEGRAM_MINI_APP_URL", "https://example.test/base?stale=1");
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test");
    vi.stubEnv("REDIS_URL", "redis://localhost:6379");
    vi.stubEnv("SESSION_SECRET", "test-session-secret");
  });

  it("passes the created match id to both participant notifications", async () => {
    const self = matchingProfile("user-z", "Self", "telegram-z", "female");
    const peer = matchingProfile("user-a", "Peer", "telegram-a", "male");
    const notifyConnectionCreated = vi.fn().mockResolvedValue(undefined);
    const matchSession = {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "match-created" })
    };
    const prisma = {
      clientInstance: {
        matchSession,
        profile: {
          findUnique: vi.fn().mockImplementation(({ where, include }) => {
            if (include) return where.userId === self.userId ? self : null;
            return where.userId === peer.userId ? peer : self;
          }),
          findMany: vi.fn().mockResolvedValue([peer])
        },
        beaconSession: { findMany: vi.fn().mockResolvedValue([]) },
        $transaction: async <T>(operation: (transaction: unknown) => Promise<T>) =>
          operation({ matchSession })
      }
    } as unknown as PrismaService;
    const policyConfig = {
      getMatchingScoring: async () => ({
        weights: {
          mood: 3,
          intent: 2,
          trustOverlap: 2,
          noConnectionsBonus: 2,
          recentMoodBonus: 1
        },
        limits: { activeConnections: 8 },
        cooldowns: { pairRematchHours: 72 },
        timers: { activeMatchHours: 24 },
        freshness: { moodHours: 2 }
      }),
      getMatchingStateMatrix: async () => ({
        compatibility: { "calm::calm": 2 }
      }),
      getMatchingIntentMatrix: async () => ({
        compatibility: { "talk::talk": 2 }
      })
    };
    const service = new MatchingRuntimeService(
      prisma,
      {} as never,
      policyConfig as never,
      {} as never,
      { notifyConnectionCreated } as never
    );

    await (
      service as unknown as { ensureMatchFill(userId: string): Promise<void> }
    ).ensureMatchFill(self.userId);

    expect(notifyConnectionCreated.mock.calls).toEqual([
      ["telegram-a", "Self", "match-created"],
      ["telegram-z", "Peer", "match-created"]
    ]);
  });

  it("builds a Mini App button for the exact connection and removes stale query data", async () => {
    const sendMessage = vi.fn().mockResolvedValue({ message_id: 41 });
    const create = vi.fn().mockResolvedValue(undefined);
    const service = new BotNotificationService(
      { getBot: () => ({ api: { sendMessage } }) } as never,
      { clientInstance: { botNotificationMessage: { create } } } as never
    );

    await service.notifyConnectionCreated(
      "telegram-a",
      "Peer",
      "match-created"
    );

    const options = sendMessage.mock.calls[0]?.[2];
    const button = options.reply_markup.inline_keyboard[0]?.[0];
    expect(button).toMatchObject({
      text: "Открыть приложение",
      web_app: {
        url: "https://example.test/connection/match-created"
      }
    });
    expect(create).toHaveBeenCalledWith({
      data: { telegramUserId: "telegram-a", messageId: 41 }
    });
  });
});
