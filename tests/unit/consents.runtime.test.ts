import { describe, expect, it, vi } from "vitest";
import { ConsentRuntimeService } from "../../apps/api/src/modules/consents/runtime.service";
import type { ConversationFeedbackService } from "../../apps/api/src/modules/conversation-feedback/service";
import type { PolicyConfigService } from "../../apps/api/src/policy-config.service";
import type { PrismaService } from "../../apps/api/src/prisma.service";
import type { ProfilesService } from "../../apps/api/src/modules/profiles";
import type { BotNotificationService } from "../../apps/api/src/telegram/bot-notification.service";

function createFixture() {
  const matches = [
    { id: "match-1", userAId: "user-a", userBId: "user-b", status: "active" },
    { id: "match-2", userAId: "user-b", userBId: "user-c", status: "active" }
  ];
  const users = [
    { id: "user-a", telegramUserId: "tg-a", telegramUsername: "alice" },
    { id: "user-b", telegramUserId: "tg-b", telegramUsername: "bob" },
    { id: "user-c", telegramUserId: "tg-c", telegramUsername: "cara" }
  ];
  const consents: Array<{
    id: string;
    matchSessionId: string;
    requestedBy: string;
    requestStatus: string;
    resolvedAt: Date | null;
  }> = [];
  const currentUserId = { value: "user-a" };
  const ensureForMutualApproval = vi.fn().mockResolvedValue(undefined);
  const prisma = {
    clientInstance: {
      matchSession: {
        findFirst: async ({ where }: { where: { id: string; OR: Array<Record<string, string>> } }) =>
          matches.find(
            (match) =>
              match.id === where.id &&
              (match.userAId === currentUserId.value || match.userBId === currentUserId.value)
          ) ?? null,
        updateMany: vi.fn().mockResolvedValue({ count: 1 })
      },
      user: {
        findUnique: async ({ where }: { where: { id: string } }) =>
          users.find((user) => user.id === where.id) ?? null
      },
      profile: {
        findUnique: vi.fn().mockResolvedValue({ displayName: "Participant" })
      },
      contactConsent: {
        upsert: async ({
          where,
          update,
          create
        }: {
          where: { id: string };
          update: { requestStatus: string; resolvedAt: Date | null };
          create: (typeof consents)[number];
        }) => {
          const existing = consents.find((consent) => consent.id === where.id);
          if (existing) {
            Object.assign(existing, update);
            return existing;
          }
          consents.push(create);
          return create;
        },
        findMany: async ({
          where
        }: {
          where: { matchSessionId: string; requestedBy: { in: string[] } };
        }) =>
          consents.filter(
            (consent) =>
              consent.matchSessionId === where.matchSessionId &&
              where.requestedBy.in.includes(consent.requestedBy)
          )
      },
      photoRevealConsent: {
        upsert: vi.fn(),
        findMany: vi.fn().mockResolvedValue([])
      }
    }
  } as unknown as PrismaService;
  const profiles = {
    getCurrentProfileRecord: async () => ({ user: { id: currentUserId.value } })
  } as unknown as ProfilesService;
  const policyConfig = {
    getRevealRules: async () => ({
      channels: {
        contact: {
          requiresMutualConsent: true,
          softWarningRequired: true,
          exposedArtifact: "telegram_deep_link" as const
        },
        photo: {
          requiresMutualConsent: true,
          exposedArtifact: "photo_asset" as const
        }
      }
    })
  } as PolicyConfigService;
  const notifications = {
    notifyContactRequest: vi.fn().mockResolvedValue(undefined),
    notifyPhotoRequest: vi.fn().mockResolvedValue(undefined)
  } as unknown as BotNotificationService;
  const feedback = { ensureForMutualApproval } as unknown as ConversationFeedbackService;
  const service = new ConsentRuntimeService(
    prisma,
    profiles,
    policyConfig,
    notifications,
    feedback
  );

  return { service, currentUserId, ensureForMutualApproval };
}

describe("ConsentRuntimeService mutual contact approval wiring", () => {
  it("creates feedback only when two distinct participants approve the same match", async () => {
    const fixture = createFixture();

    await fixture.service.updateStatus({ id: "user-a" } as never, "contact", "approved", "match-1");
    expect(fixture.ensureForMutualApproval).not.toHaveBeenCalled();

    fixture.currentUserId.value = "user-b";
    await fixture.service.updateStatus({ id: "user-b" } as never, "contact", "approved", "match-2");
    expect(fixture.ensureForMutualApproval).not.toHaveBeenCalled();

    await fixture.service.updateStatus({ id: "user-b" } as never, "contact", "approved", "match-1");
    expect(fixture.ensureForMutualApproval).toHaveBeenCalledOnce();
    expect(fixture.ensureForMutualApproval).toHaveBeenCalledWith("match-1");
  });
});
