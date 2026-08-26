import { expect, test } from "@playwright/test";
import type { Bot } from "grammy";
import type { ConversationFeedback } from "@corens/db";
import { MaintenanceService } from "../../apps/api/src/maintenance/maintenance.service";
import { ConsentRuntimeService } from "../../apps/api/src/modules/consents/runtime.service";
import { ConversationFeedbackBotHandlerService } from "../../apps/api/src/modules/conversation-feedback/bot-handler.service";
import { ConversationFeedbackService } from "../../apps/api/src/modules/conversation-feedback/service";
import type { BeaconService } from "../../apps/api/src/modules/beacon/service";
import type { MatchingRuntimeService } from "../../apps/api/src/modules/matching/runtime.service";
import type { PrivacyRuntimeService } from "../../apps/api/src/modules/privacy/runtime.service";
import type { ProfilesService } from "../../apps/api/src/modules/profiles";
import type { PolicyConfigService } from "../../apps/api/src/policy-config.service";
import type { PrismaService } from "../../apps/api/src/prisma.service";
import type { BotNotificationService } from "../../apps/api/src/telegram/bot-notification.service";
import type { BotWebhookService } from "../../apps/api/src/telegram/bot-webhook.service";

type FeedbackRecord = ConversationFeedback & {
  participant: { telegramUserId: string };
};

function createFlowFixture() {
  const matches = [
    {
      id: "match-one",
      pairKey: "user-a:user-b",
      userAId: "user-a",
      userBId: "user-b",
      origin: "automatic",
      status: "active",
      score: 90,
      createdAt: new Date("2026-08-24T08:00:00.000Z"),
      expiresAt: new Date("2026-08-31T08:00:00.000Z")
    },
    {
      id: "match-two",
      pairKey: "user-b:user-c",
      userAId: "user-b",
      userBId: "user-c",
      origin: "automatic",
      status: "active",
      score: 80,
      createdAt: new Date("2026-08-24T08:05:00.000Z"),
      expiresAt: new Date("2026-08-31T08:05:00.000Z")
    }
  ];
  const users = [
    { id: "user-a", telegramUserId: "telegram-a", telegramUsername: "alice" },
    { id: "user-b", telegramUserId: "telegram-b", telegramUsername: "bob" },
    { id: "user-c", telegramUserId: "telegram-c", telegramUsername: "cara" }
  ];
  const consents: Array<{
    id: string;
    matchSessionId: string;
    requestedBy: string;
    requestStatus: string;
    resolvedAt: Date | null;
  }> = [];
  const feedback: FeedbackRecord[] = [];
  const currentUserId = { value: "user-a" };
  const sentPrompts: Array<{ telegramUserId: string; text: string }> = [];

  const matchesFeedbackWhere = (
    item: FeedbackRecord,
    where: Record<string, unknown>
  ): boolean => {
    const due = where.promptDueAt as { lte?: Date; gt?: Date } | undefined;
    const claim = where.promptClaimedAt as Date | null | { lte?: Date } | undefined;
    const attempts = where.promptAttempts as number | { lt?: number } | undefined;
    const alternatives = where.OR as Array<Record<string, unknown>> | undefined;
    const equalsDateOrNull = (actual: Date | null, expected: unknown) =>
      expected === undefined ||
      (expected === null
        ? actual === null
        : expected instanceof Date && actual?.getTime() === expected.getTime());

    return (
      (where.id === undefined || item.id === where.id) &&
      (where.matchSessionId === undefined || item.matchSessionId === where.matchSessionId) &&
      (where.contactOpenedAt === undefined ||
        equalsDateOrNull(item.contactOpenedAt, where.contactOpenedAt)) &&
      equalsDateOrNull(item.promptedAt, where.promptedAt) &&
      equalsDateOrNull(item.completedAt, where.completedAt) &&
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
      (where.outcome === undefined || item.outcome === where.outcome) &&
      (where.value === undefined || item.value === where.value) &&
      (where.obstacle === undefined || item.obstacle === where.obstacle) &&
      (where.nextIntent === undefined || item.nextIntent === where.nextIntent) &&
      (!alternatives || alternatives.some((alternative) => matchesFeedbackWhere(item, alternative)))
    );
  };

  const applyFeedbackData = (item: FeedbackRecord, data: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(data)) {
      if (key === "promptAttempts" && typeof value === "object" && value !== null) {
        item.promptAttempts += (value as { increment: number }).increment;
      } else {
        (item as unknown as Record<string, unknown>)[key] = value;
      }
    }
    item.updatedAt = new Date();
  };

  const clientInstance = {
    matchSession: {
      findFirst: async ({ where }: { where: { id: string; OR: Array<Record<string, string>> } }) =>
        matches.find(
          (match) =>
            match.id === where.id &&
            (match.userAId === currentUserId.value || match.userBId === currentUserId.value)
        ) ?? null,
      findUnique: async ({ where }: { where: { id: string } }) =>
        matches.find((match) => match.id === where.id) ?? null,
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const found = matches.filter(
          (match) => match.id === where.id && (where.status === undefined || match.status === where.status)
        );
        found.forEach((match) => Object.assign(match, data));
        return { count: found.length };
      }
    },
    user: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        users.find((user) => user.id === where.id) ?? null
    },
    profile: {
      findUnique: async ({ where }: { where: { userId: string } }) => ({
        userId: where.userId,
        displayName: `Participant ${where.userId}`
      })
    },
    contactConsent: {
      upsert: async ({
        where,
        update,
        create
      }: {
        where: { id: string };
        update: Partial<(typeof consents)[number]>;
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
        where: {
          matchSessionId: string;
          requestedBy: { in: string[] };
          requestStatus?: string;
        };
      }) =>
        consents.filter(
          (consent) =>
            consent.matchSessionId === where.matchSessionId &&
            where.requestedBy.in.includes(consent.requestedBy) &&
            (where.requestStatus === undefined || consent.requestStatus === where.requestStatus)
        )
    },
    photoRevealConsent: {
      upsert: async () => undefined,
      findMany: async () => []
    },
    conversationFeedback: {
      upsert: async ({
        where,
        create
      }: {
        where: {
          matchSessionId_participantUserId: {
            matchSessionId: string;
            participantUserId: string;
          };
        };
        create: ConversationFeedback;
      }) => {
        const key = where.matchSessionId_participantUserId;
        const existing = feedback.find(
          (item) =>
            item.matchSessionId === key.matchSessionId &&
            item.participantUserId === key.participantUserId
        );
        if (existing) return existing;
        const user = users.find((candidate) => candidate.id === create.participantUserId);
        if (!user) throw new Error("Fixture participant missing");
        const created = {
          ...create,
          promptClaimedAt: create.promptClaimedAt ?? null,
          participant: { telegramUserId: user.telegramUserId }
        };
        feedback.push(created);
        return created;
      },
      findUnique: async ({ where }: { where: Record<string, unknown> }) => {
        if (typeof where.callbackToken === "string") {
          return feedback.find((item) => item.callbackToken === where.callbackToken) ?? null;
        }
        const key = where.matchSessionId_participantUserId as
          | { matchSessionId: string; participantUserId: string }
          | undefined;
        return key
          ? feedback.find(
              (item) =>
                item.matchSessionId === key.matchSessionId &&
                item.participantUserId === key.participantUserId
            ) ?? null
          : null;
      },
      findMany: async ({ where }: { where: Record<string, unknown> }) =>
        feedback
          .filter((item) => matchesFeedbackWhere(item, where))
          .sort(
            (left, right) =>
              left.promptDueAt.getTime() - right.promptDueAt.getTime() ||
              left.id.localeCompare(right.id)
          ),
      updateMany: async ({
        where,
        data
      }: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => {
        const found = feedback.filter((item) => matchesFeedbackWhere(item, where));
        found.forEach((item) => applyFeedbackData(item, data));
        return { count: found.length };
      }
    },
    $transaction: async <T>(operation: (transaction: typeof clientInstance) => Promise<T>) =>
      operation(clientInstance)
  };

  const prisma = { clientInstance } as unknown as PrismaService;
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
    }),
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
  const profiles = {
    getCurrentProfileRecord: async () => ({ user: { id: currentUserId.value } })
  } as unknown as ProfilesService;
  const notifications = {
    notifyContactRequest: async () => undefined,
    notifyPhotoRequest: async () => undefined
  } as unknown as BotNotificationService;
  const conversationFeedback = new ConversationFeedbackService(prisma, policyConfig);
  const consent = new ConsentRuntimeService(
    prisma,
    profiles,
    policyConfig,
    notifications,
    conversationFeedback
  );
  const feedbackBotHandler = new ConversationFeedbackBotHandlerService(
    conversationFeedback
  );
  const bot = {
    api: {
      sendMessage: async (telegramUserId: string, text: string) => {
        sentPrompts.push({ telegramUserId, text });
        return { message_id: sentPrompts.length };
      }
    }
  } as unknown as Bot;
  const maintenance = new MaintenanceService(
    { expireStaleSessions: async () => undefined } as unknown as BeaconService,
    { sweep: async () => undefined } as unknown as MatchingRuntimeService,
    { cleanupRetention: async () => undefined } as unknown as PrivacyRuntimeService,
    conversationFeedback,
    feedbackBotHandler,
    { getBot: () => bot } as BotWebhookService
  );

  const approve = async (userId: string, matchSessionId: string) => {
    currentUserId.value = userId;
    return consent.updateStatus(
      { id: userId } as never,
      "contact",
      "approved",
      matchSessionId
    );
  };
  const answerTalkedBranch = async (
    record: FeedbackRecord,
    valueCode: 0 | 1 | 2,
    nextCode: 0 | 1 | 2
  ) => {
    await feedbackBotHandler.handleCallback(
      `cf:o:${record.callbackToken}:0`,
      record.participant.telegramUserId
    );
    await feedbackBotHandler.handleCallback(
      `cf:v:${record.callbackToken}:${valueCode}`,
      record.participant.telegramUserId
    );
    await feedbackBotHandler.handleCallback(
      `cf:n:${record.callbackToken}:${nextCode}`,
      record.participant.telegramUserId
    );
  };

  return {
    approve,
    answerTalkedBranch,
    consent,
    conversationFeedback,
    feedback,
    feedbackBotHandler,
    maintenance,
    sentPrompts
  };
}

test("same-match consent, handoff, due prompts, and two independent reports reach mutual confirmation", async () => {
  const fixture = createFlowFixture();

  await fixture.approve("user-a", "match-one");
  await fixture.approve("user-b", "match-two");
  expect(fixture.feedback).toHaveLength(0);

  await fixture.approve("user-b", "match-one");
  expect(fixture.feedback).toHaveLength(2);

  const createdAt = fixture.feedback[0]?.createdAt;
  if (!createdAt) throw new Error("Feedback creation was not observed");
  const contactOpenedAt = new Date(createdAt.getTime() + 60 * 60 * 1000);
  await expect(
    fixture.conversationFeedback.recordContactOpened(
      "match-one",
      "user-a",
      contactOpenedAt
    )
  ).resolves.toEqual({ recorded: true });

  const promptDueAt = new Date(contactOpenedAt.getTime() + 24 * 60 * 60 * 1000);
  expect(fixture.feedback.every((item) => item.promptDueAt.getTime() === promptDueAt.getTime())).toBe(true);
  await expect(fixture.conversationFeedback.findDuePrompts(promptDueAt)).resolves.toHaveLength(2);
  await fixture.maintenance.runSweep(promptDueAt);
  expect(fixture.sentPrompts.map((prompt) => prompt.telegramUserId).sort()).toEqual([
    "telegram-a",
    "telegram-b"
  ]);

  const userAFeedback = fixture.feedback.find(
    (item) => item.participantUserId === "user-a"
  );
  const userBFeedback = fixture.feedback.find(
    (item) => item.participantUserId === "user-b"
  );
  if (!userAFeedback || !userBFeedback) throw new Error("Feedback pair missing");

  await fixture.answerTalkedBranch(userAFeedback, 1, 1);
  await expect(fixture.conversationFeedback.getPairStatus("match-one")).resolves.toBe(
    "one_sided_report"
  );

  await fixture.answerTalkedBranch(userBFeedback, 0, 0);
  await expect(fixture.conversationFeedback.getPairStatus("match-one")).resolves.toBe(
    "mutually_confirmed"
  );
});

test("conflicting independent reports remain unconfirmed", async () => {
  const fixture = createFlowFixture();
  await fixture.approve("user-a", "match-one");
  await fixture.approve("user-b", "match-one");

  const userAFeedback = fixture.feedback.find(
    (item) => item.participantUserId === "user-a"
  );
  const userBFeedback = fixture.feedback.find(
    (item) => item.participantUserId === "user-b"
  );
  if (!userAFeedback || !userBFeedback) throw new Error("Feedback pair missing");

  await fixture.answerTalkedBranch(userAFeedback, 2, 2);
  await fixture.feedbackBotHandler.handleCallback(
    `cf:o:${userBFeedback.callbackToken}:2`,
    userBFeedback.participant.telegramUserId
  );
  await fixture.feedbackBotHandler.handleCallback(
    `cf:b:${userBFeedback.callbackToken}:2`,
    userBFeedback.participant.telegramUserId
  );
  await fixture.feedbackBotHandler.handleCallback(
    `cf:n:${userBFeedback.callbackToken}:1`,
    userBFeedback.participant.telegramUserId
  );

  await expect(fixture.conversationFeedback.getPairStatus("match-one")).resolves.toBe(
    "conflicting_reports"
  );
});
