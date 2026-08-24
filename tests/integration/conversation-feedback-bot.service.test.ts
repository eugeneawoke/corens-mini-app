import { describe, expect, it } from "vitest";
import type { ConversationFeedback } from "@corens/db";
import { ConversationFeedbackService } from "../../apps/api/src/modules/conversation-feedback/service";
import type { PolicyConfigService } from "../../apps/api/src/policy-config.service";
import type { PrismaService } from "../../apps/api/src/prisma.service";

function createBotFeedbackFixture() {
  const feedback: ConversationFeedback = {
    id: "feedback-1",
    matchSessionId: "match-private",
    participantUserId: "user-a",
    callbackToken: "abcdefghijklmnopqrstuvwxyzABCDEF",
    contactOpenedAt: null,
    promptDueAt: new Date("2026-08-24T09:00:00.000Z"),
    promptClaimedAt: null,
    promptedAt: new Date("2026-08-24T09:00:00.000Z"),
    promptAttempts: 1,
    outcome: null,
    value: null,
    obstacle: null,
    nextIntent: null,
    completedAt: null,
    createdAt: new Date("2026-08-23T09:00:00.000Z"),
    updatedAt: new Date("2026-08-23T09:00:00.000Z")
  };
  let writeCount = 0;

  const prisma = {
    clientInstance: {
      conversationFeedback: {
        findUnique: async ({ where }: { where: { callbackToken: string } }) =>
          where.callbackToken === feedback.callbackToken
            ? {
                ...feedback,
                participant: { telegramUserId: "telegram-actor-1" }
              }
            : null,
        updateMany: async ({
          where,
          data
        }: {
          where: Record<string, unknown>;
          data: Partial<ConversationFeedback>;
        }) => {
          const matchesCurrentStep =
            where.id === feedback.id &&
            (!("outcome" in where) || where.outcome === feedback.outcome) &&
            (!("value" in where) || where.value === feedback.value) &&
            (!("obstacle" in where) || where.obstacle === feedback.obstacle) &&
            (!("nextIntent" in where) || where.nextIntent === feedback.nextIntent) &&
            (!("completedAt" in where) || where.completedAt === feedback.completedAt);

          if (!matchesCurrentStep) return { count: 0 };
          writeCount += 1;
          Object.assign(feedback, data, { updatedAt: new Date() });
          return { count: 1 };
        }
      }
    }
  } as unknown as PrismaService;

  return {
    feedback,
    getWriteCount: () => writeCount,
    service: new ConversationFeedbackService(prisma, {} as PolicyConfigService)
  };
}

describe("ConversationFeedbackService bot answers", () => {
  it("accepts the talked branch once and completes it after value and next intent", async () => {
    const fixture = createBotFeedbackFixture();

    await expect(
      fixture.service.submitBotAnswer(
        fixture.feedback.callbackToken,
        "telegram-actor-1",
        { step: "outcome", value: "talked" }
      )
    ).resolves.toEqual({ accepted: true, nextStep: "value" });

    await expect(
      fixture.service.submitBotAnswer(
        fixture.feedback.callbackToken,
        "telegram-actor-1",
        { step: "outcome", value: "talked" }
      )
    ).resolves.toEqual({ accepted: false, nextStep: "value" });

    await expect(
      fixture.service.submitBotAnswer(
        fixture.feedback.callbackToken,
        "telegram-actor-1",
        { step: "value", value: "partly" }
      )
    ).resolves.toEqual({ accepted: true, nextStep: "next_intent" });

    await expect(
      fixture.service.submitBotAnswer(
        fixture.feedback.callbackToken,
        "telegram-actor-1",
        { step: "next_intent", value: "later" },
        new Date("2026-08-24T10:00:00.000Z")
      )
    ).resolves.toEqual({ accepted: true, nextStep: "completed" });

    expect(fixture.feedback).toMatchObject({
      outcome: "talked",
      value: "partly",
      obstacle: null,
      nextIntent: "later",
      completedAt: new Date("2026-08-24T10:00:00.000Z")
    });
    expect(fixture.getWriteCount()).toBe(3);
  });

  it("accepts the no-conversation obstacle branch", async () => {
    const fixture = createBotFeedbackFixture();

    await fixture.service.submitBotAnswer(
      fixture.feedback.callbackToken,
      "telegram-actor-1",
      { step: "outcome", value: "wrote_no_reply" }
    );
    await expect(
      fixture.service.submitBotAnswer(
        fixture.feedback.callbackToken,
        "telegram-actor-1",
        { step: "obstacle", value: "did_not_know_how_to_start" }
      )
    ).resolves.toEqual({ accepted: true, nextStep: "next_intent" });
  });

  it("rejects an actor not bound to the feedback token without writing", async () => {
    const fixture = createBotFeedbackFixture();

    await expect(
      fixture.service.submitBotAnswer(
        fixture.feedback.callbackToken,
        "telegram-actor-2",
        { step: "outcome", value: "talked" }
      )
    ).resolves.toEqual({ accepted: false, nextStep: null });
    expect(fixture.getWriteCount()).toBe(0);
  });
});
