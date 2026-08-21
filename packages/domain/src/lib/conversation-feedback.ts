export const CONVERSATION_OUTCOMES = [
  "talked",
  "wrote_no_reply",
  "did_not_write",
  "declined_after_match",
  "technical_issue"
] as const;

export const CONVERSATION_VALUES = ["yes", "partly", "no"] as const;

export const CONVERSATION_OBSTACLES = [
  "bad_timing",
  "poor_fit",
  "did_not_know_how_to_start",
  "insufficient_safety",
  "technical_issue"
] as const;

export const NEXT_CONVERSATION_INTENTS = ["now", "later", "not_now"] as const;

export type ConversationOutcome = (typeof CONVERSATION_OUTCOMES)[number];
export type ConversationValue = (typeof CONVERSATION_VALUES)[number];
export type ConversationObstacle = (typeof CONVERSATION_OBSTACLES)[number];
export type NextConversationIntent = (typeof NEXT_CONVERSATION_INTENTS)[number];

export type ConversationPairStatus =
  | "awaiting_reports"
  | "one_sided_report"
  | "conflicting_reports"
  | "mutually_confirmed";

export interface ConversationOutcomeRequest {
  outcome: ConversationOutcome;
}

export interface ConversationValueRequest {
  value: ConversationValue;
}

export interface ConversationObstacleRequest {
  obstacle: ConversationObstacle;
}

export interface NextConversationIntentRequest {
  nextIntent: NextConversationIntent;
}

export interface ConversationFeedbackResponse {
  matchSessionId: string;
  outcome: ConversationOutcome | null;
  value: ConversationValue | null;
  obstacle: ConversationObstacle | null;
  nextIntent: NextConversationIntent | null;
  promptDueAt: string;
  completedAt: string | null;
}

export interface ConversationPairStatusResponse {
  matchSessionId: string;
  status: ConversationPairStatus;
}

export interface ConversationOutcomeReport {
  matchSessionId: string;
  participantUserId: string;
  outcome: ConversationOutcome | null;
}

export function deriveConversationPairStatus(
  matchSessionId: string,
  reports: ReadonlyArray<ConversationOutcomeReport>
): ConversationPairStatus {
  const reportsByParticipant = new Map(
    reports
      .filter((report) => report.matchSessionId === matchSessionId)
      .map((report) => [report.participantUserId, report.outcome] as const)
  );
  const outcomes = [...reportsByParticipant.values()];
  const talkedCount = outcomes.filter((outcome) => outcome === "talked").length;

  if (talkedCount >= 2) {
    return "mutually_confirmed";
  }

  if (talkedCount === 1) {
    return outcomes.some((outcome) => outcome !== null && outcome !== "talked")
      ? "conflicting_reports"
      : "one_sided_report";
  }

  return "awaiting_reports";
}
