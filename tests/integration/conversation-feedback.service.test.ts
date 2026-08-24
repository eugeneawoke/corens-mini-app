import { beforeEach, describe, expect, it } from "vitest";
import type { ConversationFeedback, ContactConsent, MatchSession } from "@corens/db";
import { ConversationFeedbackService } from "../../apps/api/src/modules/conversation-feedback/service";
import type { PolicyConfigService } from "../../apps/api/src/policy-config.service";
import type { PrismaService } from "../../apps/api/src/prisma.service";

function createFixture() {
  const matches: MatchSession[] = [
    {
      id: "match-1",
      pairKey: "user-a:user-b",
      userAId: "user-a",
      userBId: "user-b",
      origin: "automatic",
      status: "active",
      score: 90,
      createdAt: new Date("2026-08-20T08:00:00.000Z"),
      expiresAt: null
    }
  ];
  const consents: ContactConsent[] = [
    {
      id: "match-1:user-a:contact",
      matchSessionId: "match-1",
      requestedBy: "user-a",
      requestStatus: "approved",
      resolvedAt: new Date("2026-08-21T08:00:00.000Z")
    },
    {
      id: "match-1:user-b:contact",
      matchSessionId: "match-1",
      requestedBy: "user-b",
      requestStatus: "approved",
      resolvedAt: new Date("2026-08-21T08:01:00.000Z")
    }
  ];
  const feedback: ConversationFeedback[] = [];

  const prisma = {
    clientInstance: {
      matchSession: {
        findUnique: async ({ where }: { where: { id: string } }) =>
          matches.find((match) => match.id === where.id) ?? null
      },
      contactConsent: {
        findMany: async ({
          where
        }: {
          where: {
            matchSessionId: string;
            requestedBy: { in: string[] };
            requestStatus: string;
          };
        }) =>
          consents.filter(
            (consent) =>
              consent.matchSessionId === where.matchSessionId &&
              where.requestedBy.in.includes(consent.requestedBy) &&
              consent.requestStatus === where.requestStatus
          )
      },
      conversationFeedback: {
        findUnique: async ({
          where
        }: {
          where: {
            matchSessionId_participantUserId: {
              matchSessionId: string;
              participantUserId: string;
            };
          };
        }) =>
          feedback.find(
            (item) =>
              item.matchSessionId ===
                where.matchSessionId_participantUserId.matchSessionId &&
              item.participantUserId ===
                where.matchSessionId_participantUserId.participantUserId
          ) ?? null,
        findMany: async ({ where }: { where: { matchSessionId: string } }) =>
          feedback.filter((item) => item.matchSessionId === where.matchSessionId),
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
          update: Record<string, never>;
          create: ConversationFeedback;
        }) => {
          const existing = feedback.find(
            (item) =>
              item.matchSessionId ===
                where.matchSessionId_participantUserId.matchSessionId &&
              item.participantUserId ===
                where.matchSessionId_participantUserId.participantUserId
          );

          if (existing) return existing;
          feedback.push(create);
          return create;
        },
        update: async ({
          where,
          data
        }: {
          where: {
            matchSessionId_participantUserId: {
              matchSessionId: string;
              participantUserId: string;
            };
          };
          data: Partial<ConversationFeedback>;
        }) => {
          const existing = feedback.find(
            (item) =>
              item.matchSessionId ===
                where.matchSessionId_participantUserId.matchSessionId &&
              item.participantUserId ===
                where.matchSessionId_participantUserId.participantUserId
          );

          if (!existing) throw new Error("Feedback not found");
          Object.assign(existing, data, { updatedAt: new Date() });
          return existing;
        },
        updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
          const records = feedback.filter(
            (item) =>
              item.matchSessionId === where.matchSessionId &&
              (where.contactOpenedAt !== null || item.contactOpenedAt === null) &&
              (where.promptedAt !== null || item.promptedAt === null) &&
              (!where.promptDueAt ||
                item.promptDueAt > (where.promptDueAt as { gt: Date }).gt)
          );
          records.forEach((item) => Object.assign(item, data, { updatedAt: new Date() }));
          return { count: records.length };
        }
      },
      $transaction: async <T>(operation: (transaction: unknown) => Promise<T>) =>
        operation((prisma as { clientInstance: unknown }).clientInstance)
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

  return {
    service: new ConversationFeedbackService(prisma, policyConfig),
    feedback,
    consents
  };
}

describe("ConversationFeedbackService", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
  });

  it("idempotently creates one due feedback record for each mutually approved participant", async () => {
    const fixture = createFixture();
    const now = new Date("2026-08-21T09:00:00.000Z");

    await fixture.service.ensureForMutualApproval("match-1", now);
    await fixture.service.ensureForMutualApproval("match-1", now);

    expect(fixture.feedback).toHaveLength(2);
    expect(fixture.feedback.map((item) => item.participantUserId).sort()).toEqual([
      "user-a",
      "user-b"
    ]);
    expect(fixture.feedback.every((item) => item.promptDueAt.toISOString() === "2026-08-23T09:00:00.000Z")).toBe(true);
    expect(new Set(fixture.feedback.map((item) => item.callbackToken)).size).toBe(2);
    expect(fixture.feedback.every((item) => /^[A-Za-z0-9_-]{32}$/.test(item.callbackToken))).toBe(true);
  });

  it("does not create feedback until both participants approved the same match", async () => {
    const fixture = createFixture();
    fixture.consents.pop();

    await expect(
      fixture.service.ensureForMutualApproval(
        "match-1",
        new Date("2026-08-21T09:00:00.000Z")
      )
    ).rejects.toThrow("Mutual contact approval required");
    expect(fixture.feedback).toHaveLength(0);
  });

  it("records only the first match handoff open and advances both pending prompts", async () => {
    const fixture = createFixture();
    await fixture.service.ensureForMutualApproval(
      "match-1",
      new Date("2026-08-21T09:00:00.000Z")
    );

    await expect(
      fixture.service.recordContactOpened(
        "match-1",
        "user-a",
        new Date("2026-08-21T10:00:00.000Z")
      )
    ).resolves.toEqual({ recorded: true });
    await expect(
      fixture.service.recordContactOpened(
        "match-1",
        "user-b",
        new Date("2026-08-21T11:00:00.000Z")
      )
    ).resolves.toEqual({ recorded: false });

    expect(fixture.feedback.find((item) => item.participantUserId === "user-a")?.contactOpenedAt)
      .toEqual(new Date("2026-08-21T10:00:00.000Z"));
    expect(fixture.feedback.find((item) => item.participantUserId === "user-b")?.contactOpenedAt)
      .toEqual(new Date("2026-08-21T10:00:00.000Z"));
    expect(
      fixture.feedback.every(
        (item) => item.promptDueAt.toISOString() === "2026-08-22T10:00:00.000Z"
      )
    ).toBe(true);
  });

  it("rejects contact-open tracking by a user outside the match", async () => {
    const fixture = createFixture();
    await fixture.service.ensureForMutualApproval(
      "match-1",
      new Date("2026-08-21T09:00:00.000Z")
    );

    await expect(
      fixture.service.recordContactOpened(
        "match-1",
        "user-c",
        new Date("2026-08-21T10:00:00.000Z")
      )
    ).rejects.toThrow("Feedback not found");
  });

  it("does not delay a pending prompt that is already due sooner than 24 hours", async () => {
    const fixture = createFixture();
    await fixture.service.ensureForMutualApproval(
      "match-1",
      new Date("2026-08-21T09:00:00.000Z")
    );
    const userBFeedback = fixture.feedback.find(
      (item) => item.participantUserId === "user-b"
    );
    if (!userBFeedback) throw new Error("Fixture feedback missing");
    userBFeedback.promptDueAt = new Date("2026-08-21T18:00:00.000Z");

    await fixture.service.recordContactOpened(
      "match-1",
      "user-a",
      new Date("2026-08-21T10:00:00.000Z")
    );

    expect(userBFeedback.promptDueAt).toEqual(new Date("2026-08-21T18:00:00.000Z"));
  });

  it("rejects a feedback write by a user outside the match", async () => {
    const fixture = createFixture();
    await fixture.service.ensureForMutualApproval(
      "match-1",
      new Date("2026-08-21T09:00:00.000Z")
    );

    await expect(
      fixture.service.recordOutcome("match-1", "user-c", "talked")
    ).rejects.toThrow("Feedback not found");
  });

  it("completes the talked branch and derives mutual confirmation only after both reports", async () => {
    const fixture = createFixture();
    const createdAt = new Date("2026-08-21T09:00:00.000Z");
    await fixture.service.ensureForMutualApproval("match-1", createdAt);

    await fixture.service.recordOutcome("match-1", "user-a", "talked");
    expect(await fixture.service.getPairStatus("match-1")).toBe("one_sided_report");

    await fixture.service.recordValue("match-1", "user-a", "partly");
    await fixture.service.recordNextIntent(
      "match-1",
      "user-a",
      "later",
      new Date("2026-08-22T10:00:00.000Z")
    );
    await fixture.service.recordOutcome("match-1", "user-b", "talked");

    expect(await fixture.service.getPairStatus("match-1")).toBe("mutually_confirmed");
    expect(fixture.feedback.find((item) => item.participantUserId === "user-a")).toMatchObject({
      outcome: "talked",
      value: "partly",
      obstacle: null,
      nextIntent: "later",
      completedAt: new Date("2026-08-22T10:00:00.000Z")
    });
  });

  it("completes the obstacle branch and keeps conflicting pair answers unconfirmed", async () => {
    const fixture = createFixture();
    await fixture.service.ensureForMutualApproval(
      "match-1",
      new Date("2026-08-21T09:00:00.000Z")
    );

    await fixture.service.recordOutcome("match-1", "user-a", "talked");
    await fixture.service.recordOutcome("match-1", "user-b", "did_not_write");
    await fixture.service.recordObstacle(
      "match-1",
      "user-b",
      "did_not_know_how_to_start"
    );
    await fixture.service.recordNextIntent("match-1", "user-b", "now");

    expect(await fixture.service.getPairStatus("match-1")).toBe("conflicting_reports");
    expect(fixture.feedback.find((item) => item.participantUserId === "user-b")).toMatchObject({
      outcome: "did_not_write",
      value: null,
      obstacle: "did_not_know_how_to_start",
      nextIntent: "now"
    });
  });

  it("enforces the value and obstacle branches before completion", async () => {
    const fixture = createFixture();
    await fixture.service.ensureForMutualApproval(
      "match-1",
      new Date("2026-08-21T09:00:00.000Z")
    );

    await fixture.service.recordOutcome("match-1", "user-a", "talked");
    await expect(
      fixture.service.recordObstacle("match-1", "user-a", "bad_timing")
    ).rejects.toThrow("Obstacle is only valid when no conversation was reported");
    await expect(
      fixture.service.recordNextIntent("match-1", "user-a", "later")
    ).rejects.toThrow("Question two must be completed first");
  });
});
