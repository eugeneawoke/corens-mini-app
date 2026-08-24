import { describe, expect, it } from "vitest";
import type { Bot } from "grammy";
import type { ConversationFeedback } from "@corens/db";
import { MaintenanceService } from "../../apps/api/src/maintenance/maintenance.service";
import { ConversationFeedbackBotHandlerService } from "../../apps/api/src/modules/conversation-feedback/bot-handler.service";
import { ConversationFeedbackService } from "../../apps/api/src/modules/conversation-feedback/service";
import type { BeaconService } from "../../apps/api/src/modules/beacon/service";
import type { MatchingRuntimeService } from "../../apps/api/src/modules/matching/runtime.service";
import type { PrivacyRuntimeService } from "../../apps/api/src/modules/privacy/runtime.service";
import type { PolicyConfigService } from "../../apps/api/src/policy-config.service";
import type { PrismaService } from "../../apps/api/src/prisma.service";
import type { BotWebhookService } from "../../apps/api/src/telegram/bot-webhook.service";

interface FeedbackWithParticipant extends ConversationFeedback {
  promptClaimedAt: Date | null;
  participant: { telegramUserId: string };
}

function feedback(
  id: string,
  overrides: Partial<FeedbackWithParticipant> = {}
): FeedbackWithParticipant {
  return {
    id,
    matchSessionId: "match-1",
    participantUserId: `user-${id}`,
    callbackToken: `AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA${id}`,
    contactOpenedAt: null,
    promptDueAt: new Date("2026-08-24T09:00:00.000Z"),
    promptClaimedAt: null,
    promptedAt: null,
    promptAttempts: 0,
    outcome: null,
    value: null,
    obstacle: null,
    nextIntent: null,
    completedAt: null,
    createdAt: new Date("2026-08-22T09:00:00.000Z"),
    updatedAt: new Date("2026-08-22T09:00:00.000Z"),
    participant: { telegramUserId: `telegram-${id}` },
    ...overrides
  };
}

function createFixture(records: FeedbackWithParticipant[]) {
  const sent: Array<{ telegramUserId: string; text: string }> = [];
  const deliverySnapshots: Array<{
    telegramUserId: string;
    promptClaimedAt: Date | null;
    promptedAt: Date | null;
  }> = [];
  const failedTelegramUserIds = new Set<string>();

  const matchesWhere = (
    item: FeedbackWithParticipant,
    where: Record<string, unknown>
  ): boolean => {
    const due = where.promptDueAt as { lte?: Date; gt?: Date } | undefined;
    const attempts = where.promptAttempts as { lt?: number } | number | undefined;
    const claim = where.promptClaimedAt as
      | { lte?: Date }
      | Date
      | null
      | undefined;
    const alternatives = where.OR as Array<Record<string, unknown>> | undefined;

    return (
      (!where.id || item.id === where.id) &&
      (where.promptedAt === undefined ||
        (where.promptedAt === null
          ? item.promptedAt === null
          : item.promptedAt?.getTime() === (where.promptedAt as Date).getTime())) &&
      (where.completedAt === undefined || item.completedAt === where.completedAt) &&
      (due?.lte === undefined || item.promptDueAt <= due.lte) &&
      (due?.gt === undefined || item.promptDueAt > due.gt) &&
      (claim === undefined ||
        (claim === null
          ? item.promptClaimedAt === null
          : claim instanceof Date
            ? item.promptClaimedAt?.getTime() === claim.getTime()
            : claim.lte === undefined ||
              (item.promptClaimedAt !== null && item.promptClaimedAt <= claim.lte))) &&
      (typeof attempts !== "number" || item.promptAttempts === attempts) &&
      (typeof attempts !== "object" ||
        attempts.lt === undefined ||
        item.promptAttempts < attempts.lt) &&
      (!alternatives || alternatives.some((alternative) => matchesWhere(item, alternative)))
    );
  };

  const prisma = {
    clientInstance: {
      conversationFeedback: {
        findMany: async ({ where }: { where: Record<string, unknown> }) =>
          records
            .filter((item) => matchesWhere(item, where))
            .sort((left, right) => left.promptDueAt.getTime() - right.promptDueAt.getTime()),
        updateMany: async ({
          where,
          data
        }: {
          where: Record<string, unknown>;
          data: {
            promptedAt?: Date | null;
            promptClaimedAt?: Date | null;
            promptAttempts?: { increment: number };
          };
        }) => {
          const matching = records.filter((item) => matchesWhere(item, where));
          matching.forEach((item) => {
            if (data.promptedAt !== undefined) item.promptedAt = data.promptedAt;
            if (data.promptClaimedAt !== undefined) {
              item.promptClaimedAt = data.promptClaimedAt;
            }
            if (data.promptAttempts) {
              item.promptAttempts += data.promptAttempts.increment;
            }
          });
          return { count: matching.length };
        }
      }
    }
  } as unknown as PrismaService;

  const policyConfig = {
    getConversationFeedbackRules: async () => ({
      version: "v1",
      timing: {
        afterContactOpenHours: 24,
        withoutContactOpenHours: 48,
        expiresAfterDays: 7
      },
      delivery: {
        reminderEnabled: false,
        maxPromptAttempts: 3,
        claimLeaseMinutes: 15
      }
    })
  } as PolicyConfigService;

  const conversationFeedback = new ConversationFeedbackService(prisma, policyConfig);
  const feedbackBotHandler = new ConversationFeedbackBotHandlerService(
    conversationFeedback
  );
  const bot = {
    api: {
      sendMessage: async (telegramUserId: string, text: string) => {
        const record = records.find(
          (item) => item.participant.telegramUserId === telegramUserId
        );
        if (!record) throw new Error("Feedback record missing");
        deliverySnapshots.push({
          telegramUserId,
          promptClaimedAt: record.promptClaimedAt,
          promptedAt: record.promptedAt
        });
        if (failedTelegramUserIds.has(telegramUserId)) {
          throw new Error("Telegram unavailable");
        }
        sent.push({ telegramUserId, text });
        return { message_id: sent.length };
      }
    }
  } as unknown as Bot;
  const botWebhook = { getBot: () => bot } as BotWebhookService;
  const maintenance = new MaintenanceService(
    { expireStaleSessions: async () => undefined } as unknown as BeaconService,
    { sweep: async () => undefined } as unknown as MatchingRuntimeService,
    { cleanupRetention: async () => undefined } as unknown as PrivacyRuntimeService,
    conversationFeedback,
    feedbackBotHandler,
    botWebhook
  );

  return { deliverySnapshots, failedTelegramUserIds, maintenance, records, sent };
}

describe("conversation feedback maintenance", () => {
  it("delivers only due unexpired prompts and marks successful delivery once", async () => {
    const now = new Date("2026-08-24T10:00:00.000Z");
    const due = feedback("1");
    const future = feedback("2", {
      promptDueAt: new Date("2026-08-24T10:00:00.001Z")
    });
    const expired = feedback("3", {
      promptDueAt: new Date("2026-08-17T09:59:59.999Z")
    });
    const completed = feedback("4", {
      completedAt: new Date("2026-08-24T09:30:00.000Z")
    });
    const alreadyPrompted = feedback("5", {
      promptedAt: new Date("2026-08-24T09:30:00.000Z"),
      promptAttempts: 1
    });
    const fixture = createFixture([
      due,
      future,
      expired,
      completed,
      alreadyPrompted
    ]);

    await fixture.maintenance.runSweep(now);
    await fixture.maintenance.runSweep(now);

    expect(fixture.sent).toEqual([
      {
        telegramUserId: "telegram-1",
        text: "Что произошло после того, как вы оба согласились открыть контакт?"
      }
    ]);
    expect(due.promptedAt).toEqual(now);
    expect(due.promptClaimedAt).toBeNull();
    expect(due.promptAttempts).toBe(1);
    expect(fixture.deliverySnapshots).toEqual([
      {
        telegramUserId: "telegram-1",
        promptClaimedAt: now,
        promptedAt: null
      }
    ]);
    expect(future.promptAttempts).toBe(0);
    expect(expired.promptAttempts).toBe(0);
    expect(completed.promptAttempts).toBe(0);
    expect(alreadyPrompted.promptAttempts).toBe(1);
  });

  it("guards overlapping sweeps so one active sequence is sent once", async () => {
    const now = new Date("2026-08-24T10:00:00.000Z");
    const due = feedback("1");
    const fixture = createFixture([due]);

    await Promise.all([
      fixture.maintenance.runSweep(now),
      fixture.maintenance.runSweep(now)
    ]);

    expect(fixture.sent).toHaveLength(1);
    expect(due.promptAttempts).toBe(1);
    expect(due.promptedAt).toEqual(now);
  });

  it("recovers an expired claim but leaves a fresh claim alone", async () => {
    const now = new Date("2026-08-24T10:00:00.000Z");
    const staleClaim = feedback("1", {
      promptClaimedAt: new Date("2026-08-24T09:45:00.000Z"),
      promptAttempts: 1
    });
    const freshClaim = feedback("2", {
      promptClaimedAt: new Date("2026-08-24T09:45:00.001Z"),
      promptAttempts: 1
    });
    const fixture = createFixture([staleClaim, freshClaim]);

    await fixture.maintenance.runSweep(now);

    expect(fixture.sent.map((item) => item.telegramUserId)).toEqual(["telegram-1"]);
    expect(staleClaim.promptAttempts).toBe(2);
    expect(staleClaim.promptClaimedAt).toBeNull();
    expect(staleClaim.promptedAt).toEqual(now);
    expect(freshClaim.promptAttempts).toBe(1);
    expect(freshClaim.promptClaimedAt).toEqual(
      new Date("2026-08-24T09:45:00.001Z")
    );
    expect(freshClaim.promptedAt).toBeNull();
  });

  it("releases failed claims, continues other deliveries, and stops at max attempts", async () => {
    const firstSweep = new Date("2026-08-24T10:00:00.000Z");
    const failing = feedback("1", { promptAttempts: 1 });
    const succeeding = feedback("2");
    const fixture = createFixture([failing, succeeding]);
    fixture.failedTelegramUserIds.add("telegram-1");

    await fixture.maintenance.runSweep(firstSweep);

    expect(failing.promptAttempts).toBe(2);
    expect(failing.promptClaimedAt).toBeNull();
    expect(failing.promptedAt).toBeNull();
    expect(fixture.sent.map((item) => item.telegramUserId)).toEqual(["telegram-2"]);

    await fixture.maintenance.runSweep(new Date("2026-08-24T10:05:00.000Z"));
    await fixture.maintenance.runSweep(new Date("2026-08-24T10:10:00.000Z"));

    expect(failing.promptAttempts).toBe(3);
    expect(failing.promptedAt).toBeNull();
    expect(fixture.sent).toHaveLength(1);
  });
});
