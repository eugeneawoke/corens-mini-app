import type { MatchingCandidate, MatchingScoreBreakdown } from "./matching";

export interface MatchingPolicyInput {
  self: MatchingCandidate;
  candidate: MatchingCandidate;
  moodScore: number;
  intentScore: number;
  moodUpdatedRecently: boolean;
  hasPairExclusion: boolean;
  hasActivePairMatch: boolean;
}

export interface MatchingPolicyConfig {
  weights: {
    mood: number;
    intent: number;
    trustOverlap: number;
    noConnectionsBonus: number;
    recentMoodBonus: number;
  };
  limits: {
    activeConnections: number;
  };
}

export interface MatchingEvaluation {
  isEligible: boolean;
  reasons: string[];
  score: number;
  breakdown: MatchingScoreBreakdown;
}

export function evaluateMatchingCandidate(
  input: MatchingPolicyInput,
  config: MatchingPolicyConfig
): MatchingEvaluation {
  const reasons: string[] = [];
  const overlapCount = countTrustKeyOverlap(input.self.trustKeys, input.candidate.trustKeys);

  if (input.self.userId === input.candidate.userId) {
    reasons.push("same_user");
  }

  if (input.candidate.isHidden || !input.candidate.matchingEnabled) {
    reasons.push("candidate_not_matchable");
  }

  if (overlapCount < 1) {
    reasons.push("missing_trust_overlap");
  }

  if (input.hasPairExclusion) {
    reasons.push("pair_exclusion_active");
  }

  if (input.hasActivePairMatch) {
    reasons.push("pair_match_already_active");
  }

  if (input.self.activeConnectionsCount >= config.limits.activeConnections) {
    reasons.push("self_limit_reached");
  }

  if (input.candidate.activeConnectionsCount >= config.limits.activeConnections) {
    reasons.push("candidate_limit_reached");
  }

  const breakdown: MatchingScoreBreakdown = {
    moodScore: input.moodScore * config.weights.mood,
    intentScore: input.intentScore * config.weights.intent,
    trustOverlapCount: overlapCount * config.weights.trustOverlap,
    noConnectionsBonus:
      input.candidate.activeConnectionsCount === 0 ? config.weights.noConnectionsBonus : 0,
    recentMoodBonus: input.moodUpdatedRecently ? config.weights.recentMoodBonus : 0
  };

  return {
    isEligible: reasons.length === 0,
    reasons,
    score:
      breakdown.moodScore +
      breakdown.intentScore +
      breakdown.trustOverlapCount +
      breakdown.noConnectionsBonus +
      breakdown.recentMoodBonus,
    breakdown
  };
}

function countTrustKeyOverlap(left: string[], right: string[]): number {
  const rightSet = new Set(right);
  return left.filter((item) => rightSet.has(item)).length;
}
