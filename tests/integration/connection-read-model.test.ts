import { describe, expect, it } from "vitest";
import { MatchingRuntimeService } from "../../apps/api/src/modules/matching/runtime.service";

const pendingPhoto = {
  channel: "photo" as const,
  status: "pending" as const,
  myDecision: "pending" as const,
  peerRequested: false,
  warnings: []
};

describe("active connection read model", () => {
  it("returns actionable connections first and normalizes the peer bio", async () => {
    const sessions = [
      { id: "neutral-newest", userAId: "self", userBId: "peer-neutral", origin: "auto", score: 80, pairKey: "a", expiresAt: new Date("2026-09-05") },
      { id: "mutual-newest", userAId: "self", userBId: "peer-mutual-new", origin: "auto", score: 80, pairKey: "b", expiresAt: new Date("2026-09-05") },
      { id: "inbound-newest", userAId: "self", userBId: "peer-inbound-new", origin: "auto", score: 80, pairKey: "c", expiresAt: new Date("2026-09-05") },
      { id: "mutual-older", userAId: "self", userBId: "peer-mutual-old", origin: "auto", score: 80, pairKey: "d", expiresAt: new Date("2026-09-05") },
      { id: "inbound-older", userAId: "self", userBId: "peer-inbound-old", origin: "auto", score: 80, pairKey: "e", expiresAt: new Date("2026-09-05") },
      { id: "neutral-older", userAId: "self", userBId: "peer-neutral-old", origin: "auto", score: 80, pairKey: "f", expiresAt: new Date("2026-09-05") }
    ];
    const profiles = {
      "peer-neutral": { userId: "peer-neutral", displayName: "Neutral newest", about: null, stateKey: "calm", trustKeys: [], user: { telegramUsername: null, telegramUserId: "tg-neutral" } },
      "peer-mutual-new": { userId: "peer-mutual-new", displayName: "Mutual newest", about: "Люблю долгие прогулки", stateKey: "calm", trustKeys: [], user: { telegramUsername: null, telegramUserId: "tg-mutual-new" } },
      "peer-inbound-new": { userId: "peer-inbound-new", displayName: "Inbound newest", about: null, stateKey: "calm", trustKeys: [], user: { telegramUsername: null, telegramUserId: "tg-inbound-new" } },
      "peer-mutual-old": { userId: "peer-mutual-old", displayName: "Mutual older", about: "   ", stateKey: "calm", trustKeys: [], user: { telegramUsername: null, telegramUserId: "tg-mutual-old" } },
      "peer-inbound-old": { userId: "peer-inbound-old", displayName: "Inbound older", about: null, stateKey: "calm", trustKeys: [], user: { telegramUsername: null, telegramUserId: "tg-inbound-old" } },
      "peer-neutral-old": { userId: "peer-neutral-old", displayName: "Neutral older", about: null, stateKey: "calm", trustKeys: [], user: { telegramUsername: null, telegramUserId: "tg-neutral-old" } }
    };
    const prisma = {
      clientInstance: {
        matchSession: {
          findMany: async ({ where }: { where: { expiresAt?: unknown } }) => {
            if (where.expiresAt === null || typeof where.expiresAt === "object") return [];
            return sessions;
          }
        },
        profile: {
          findUnique: async ({ where }: { where: { userId: keyof typeof profiles } }) => profiles[where.userId] ?? null
        }
      }
    };
    const contactStatusBySession = {
      "neutral-newest": { status: "pending", myDecision: "approved", peerRequested: true },
      "mutual-newest": { status: "approved", myDecision: "approved", peerRequested: true },
      "inbound-newest": { status: "pending", myDecision: "pending", peerRequested: true },
      "mutual-older": { status: "approved", myDecision: "approved", peerRequested: false },
      "inbound-older": { status: "pending", myDecision: "pending", peerRequested: true },
      "neutral-older": { status: "pending", myDecision: "pending", peerRequested: false }
    } as const;
    const service = new MatchingRuntimeService(
      prisma as never,
      {
        getCurrentProfileRecord: async () => ({
          user: { id: "self" },
          profile: { stateKey: "calm", trustKeys: [] }
        })
      } as never,
      {
        getMatchingScoring: async () => ({
          limits: { activeConnections: sessions.length },
          cooldowns: { pairRematchHours: 72 },
          timers: { activeMatchHours: 24 }
        })
      } as never,
      {
        buildStatusForMatch: async (sessionId: keyof typeof contactStatusBySession) => ({
          contact: { channel: "contact", ...contactStatusBySession[sessionId], warnings: [] },
          photo: pendingPhoto
        })
      } as never,
      {} as never
    );

    const connections = await service.getConnections({ id: "self" } as never);

    expect(connections.map((connection) => (connection.kind === "active" ? connection.id : connection.kind))).toEqual([
      "mutual-newest",
      "mutual-older",
      "inbound-newest",
      "inbound-older",
      "neutral-newest",
      "neutral-older"
    ]);
    expect(connections[0]).toMatchObject({ kind: "active", about: "Люблю долгие прогулки" });
    expect(connections[1]).toMatchObject({ kind: "active", about: null });
    expect(connections[4]).toMatchObject({ kind: "active", about: null });
  });
});
