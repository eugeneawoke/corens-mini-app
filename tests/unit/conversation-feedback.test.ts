import { describe, expect, it } from "vitest";
import { deriveConversationPairStatus } from "../../packages/domain/src";

describe("deriveConversationPairStatus", () => {
  it("confirms a conversation only for two distinct talked reports in the same match", () => {
    expect(
      deriveConversationPairStatus("match-1", [
        { matchSessionId: "match-1", participantUserId: "user-a", outcome: "talked" },
        { matchSessionId: "match-1", participantUserId: "user-b", outcome: "talked" }
      ])
    ).toBe("mutually_confirmed");
  });

  it("does not combine talked reports from different matches", () => {
    expect(
      deriveConversationPairStatus("match-1", [
        { matchSessionId: "match-1", participantUserId: "user-a", outcome: "talked" },
        { matchSessionId: "match-2", participantUserId: "user-b", outcome: "talked" }
      ])
    ).toBe("one_sided_report");
  });

  it("does not count duplicate reports from one participant as mutual", () => {
    expect(
      deriveConversationPairStatus("match-1", [
        { matchSessionId: "match-1", participantUserId: "user-a", outcome: "talked" },
        { matchSessionId: "match-1", participantUserId: "user-a", outcome: "talked" }
      ])
    ).toBe("one_sided_report");
  });

  it("keeps a talked and non-talked pair visible as conflicting reports", () => {
    expect(
      deriveConversationPairStatus("match-1", [
        { matchSessionId: "match-1", participantUserId: "user-a", outcome: "talked" },
        {
          matchSessionId: "match-1",
          participantUserId: "user-b",
          outcome: "wrote_no_reply"
        }
      ])
    ).toBe("conflicting_reports");
  });

  it("awaits positive reports when nobody reports a conversation", () => {
    expect(
      deriveConversationPairStatus("match-1", [
        { matchSessionId: "match-1", participantUserId: "user-a", outcome: null },
        {
          matchSessionId: "match-1",
          participantUserId: "user-b",
          outcome: "did_not_write"
        }
      ])
    ).toBe("awaiting_reports");
  });
});
