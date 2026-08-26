import { describe, expect, it } from "vitest";
import {
  buildConversationPilotExport,
  parseConversationPilotExportArgs
} from "../../apps/api/src/scripts/export-conversation-pilot";

describe("conversation pilot export", () => {
  it("exports only cohort aggregates and pseudonymous pair-level match evidence", () => {
    const exportResult = buildConversationPilotExport({
      cohort: {
        label: "pilot-2026-08",
        from: new Date("2026-08-24T00:00:00.000Z"),
        to: new Date("2026-09-07T00:00:00.000Z")
      },
      pseudonymizationKey: "0123456789abcdef0123456789abcdef",
      participants: [
        { userId: "user-alice-private", onboardingCompleted: true },
        { userId: "user-bob-private", onboardingCompleted: true },
        { userId: "user-cara-private", onboardingCompleted: false }
      ],
      matches: [
        {
          id: "match-raw-confirmed",
          createdAt: new Date("2026-08-24T10:00:00.000Z"),
          participantUserIds: ["user-alice-private", "user-bob-private"],
          contactConsents: [
            { participantUserId: "user-alice-private", status: "approved" },
            { participantUserId: "user-bob-private", status: "approved" }
          ],
          feedback: [
            {
              participantUserId: "user-alice-private",
              contactOpenedAt: new Date("2026-08-25T10:00:00.000Z"),
              outcome: "talked",
              value: "yes",
              obstacle: null,
              nextIntent: "now"
            },
            {
              participantUserId: "user-bob-private",
              contactOpenedAt: new Date("2026-08-25T10:00:00.000Z"),
              outcome: "talked",
              value: "partly",
              obstacle: null,
              nextIntent: "later"
            }
          ]
        },
        {
          id: "match-raw-conflicting",
          createdAt: new Date("2026-09-01T12:00:00.000Z"),
          participantUserIds: ["user-bob-private", "user-cara-private"],
          contactConsents: [
            { participantUserId: "user-bob-private", status: "approved" },
            { participantUserId: "user-cara-private", status: "approved" }
          ],
          feedback: [
            {
              participantUserId: "user-bob-private",
              contactOpenedAt: null,
              outcome: "talked",
              value: "no",
              obstacle: null,
              nextIntent: "not_now"
            },
            {
              participantUserId: "user-cara-private",
              contactOpenedAt: null,
              outcome: "did_not_write",
              value: null,
              obstacle: "did_not_know_how_to_start",
              nextIntent: "later"
            },
            {
              participantUserId: "user-outsider-private",
              contactOpenedAt: new Date("2026-09-01T13:00:00.000Z"),
              outcome: "talked",
              value: "yes",
              obstacle: null,
              nextIntent: "now"
            }
          ]
        }
      ]
    });

    expect(exportResult).toEqual({
      schemaVersion: "conversation-pilot.v1",
      cohort: {
        label: "pilot-2026-08",
        from: "2026-08-24T00:00:00.000Z",
        to: "2026-09-07T00:00:00.000Z",
        boundary: "match_created_at_from_inclusive_to_exclusive"
      },
      aggregates: {
        onboardingCompletedParticipants: 2,
        matchSessions: 2,
        mutualContactApprovals: 2,
        contactHandoffOpened: 1,
        conversationReported: 2,
        oneSidedConversationReports: 0,
        conversationMutuallyConfirmed: 1,
        conversationUseful: 1,
        anotherConversationRequested: 2,
        pairStatuses: {
          awaiting_reports: 0,
          one_sided_report: 0,
          conflicting_reports: 1,
          mutually_confirmed: 1
        },
        valueAnswers: { yes: 1, partly: 1, no: 1 },
        nextIntentAnswers: { now: 1, later: 2, not_now: 1 },
        nonConversationObstacles: {
          bad_timing: 0,
          poor_fit: 0,
          did_not_know_how_to_start: 1,
          insufficient_safety: 0,
          technical_issue: 0
        }
      },
      northStarByMatchCohortWeek: [
        { weekStart: "2026-08-24", mutuallyConfirmedConversations: 1 },
        { weekStart: "2026-08-31", mutuallyConfirmedConversations: 0 }
      ],
      matches: [
        {
          matchId: expect.stringMatching(/^m_[A-Za-z0-9_-]{22}$/),
          matchCohortWeek: "2026-08-24",
          pairStatus: "mutually_confirmed",
          mutualContactApproved: true,
          contactHandoffOpened: true,
          conversationReported: true,
          mutuallyConfirmed: true,
          conversationUseful: true,
          anotherConversationRequested: true
        },
        {
          matchId: expect.stringMatching(/^m_[A-Za-z0-9_-]{22}$/),
          matchCohortWeek: "2026-08-31",
          pairStatus: "conflicting_reports",
          mutualContactApproved: true,
          contactHandoffOpened: false,
          conversationReported: true,
          mutuallyConfirmed: false,
          conversationUseful: false,
          anotherConversationRequested: true
        }
      ]
    });

    expect(new Set(exportResult.matches.map((match) => match.matchId)).size).toBe(2);
    const serialized = JSON.stringify(exportResult);
    for (const forbidden of [
      "match-raw",
      "user-alice",
      "user-bob",
      "user-cara",
      "user-outsider",
      "telegram",
      "username",
      "callback",
      "https://t.me/",
      "tg://",
      "message"
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("requires an explicit safe cohort slug, ordered dates, and a strong secret", () => {
    expect(() =>
      parseConversationPilotExportArgs(
        ["--from", "2026-08-24", "--to", "2026-09-07", "--cohort", "pilot 1"],
        "0123456789abcdef0123456789abcdef"
      )
    ).toThrow("Cohort label must be a privacy-safe slug");

    expect(() =>
      parseConversationPilotExportArgs(
        ["--from", "2026-09-07", "--to", "2026-08-24", "--cohort", "pilot-1"],
        "0123456789abcdef0123456789abcdef"
      )
    ).toThrow("--from must be earlier than --to");

    expect(() =>
      parseConversationPilotExportArgs(
        ["--from", "2026-08-24", "--to", "2026-09-07", "--cohort", "pilot-1"],
        "short-secret"
      )
    ).toThrow("PILOT_EXPORT_PSEUDONYM_KEY must be at least 32 characters");
  });
});
