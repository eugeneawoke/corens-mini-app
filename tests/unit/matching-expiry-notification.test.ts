import { describe, expect, it, vi } from "vitest";
import { MatchingRuntimeService } from "../../apps/api/src/modules/matching/runtime.service";

describe("expired connection Telegram notification", () => {
  it("notifies both participants once when overlapping expiry checks close one session", async () => {
    const session = {
      id: "match-expired",
      userAId: "user-a",
      userBId: "user-b",
      status: "active",
      expiresAt: new Date("2026-09-01T09:00:00.000Z")
    };
    let staleReaders = 0;
    let releaseStaleReaders: (() => void) | undefined;
    const bothReadersReady = new Promise<void>((resolve) => {
      releaseStaleReaders = resolve;
    });
    const matchSession = {
      findMany: vi.fn(async ({ where }: { where: { expiresAt: unknown } }) => {
        if (where.expiresAt === null) return [];
        if (session.status !== "active") return [];
        staleReaders += 1;
        if (staleReaders === 2) releaseStaleReaders?.();
        await bothReadersReady;
        return [
          {
            id: session.id,
            userAId: session.userAId,
            userBId: session.userBId
          }
        ];
      }),
      update: vi.fn(async ({ data }: { data: { status?: string; expiresAt?: Date } }) => {
        Object.assign(session, data);
        return session;
      }),
      updateMany: vi.fn(async () => {
        if (session.status !== "active") return { count: 0 };
        session.status = "closed_expired";
        return { count: 1 };
      })
    };
    const contactConsent = {
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn().mockResolvedValue({ count: 1 })
    };
    const photoRevealConsent = {
      updateMany: vi.fn().mockResolvedValue({ count: 1 })
    };
    const profiles = {
      "user-a": {
        displayName: "Alice",
        user: { telegramUserId: "tg-a" }
      },
      "user-b": {
        displayName: "Bob",
        user: { telegramUserId: "tg-b" }
      }
    };
    const prisma = {
      clientInstance: {
        matchSession,
        contactConsent,
        photoRevealConsent,
        profile: {
          findUnique: vi.fn(async ({ where }: { where: { userId: keyof typeof profiles } }) =>
            profiles[where.userId]
          )
        },
        $transaction: async <T>(operation: (tx: unknown) => Promise<T>) =>
          operation({ matchSession, contactConsent, photoRevealConsent })
      }
    };
    const notifyConnectionClosed = vi.fn().mockResolvedValue(undefined);
    const service = new MatchingRuntimeService(
      prisma as never,
      {} as never,
      {
        getMatchingScoring: async () => ({
          cooldowns: { pairRematchHours: 72 },
          timers: { activeMatchHours: 24 }
        })
      } as never,
      {} as never,
      { notifyConnectionClosed } as never
    );
    const expire = () =>
      (
        service as unknown as {
          expireStaleActiveMatches(): Promise<void>;
        }
      ).expireStaleActiveMatches();

    await Promise.all([expire(), expire()]);

    expect(matchSession.updateMany).toHaveBeenCalledTimes(2);
    expect(notifyConnectionClosed).toHaveBeenCalledTimes(2);
    expect(notifyConnectionClosed.mock.calls).toEqual(
      expect.arrayContaining([
        ["tg-a", "Bob"],
        ["tg-b", "Alice"]
      ])
    );
  });
});
