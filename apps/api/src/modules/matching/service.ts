import type { MatchingCandidate } from "@corens/domain";
import { evaluateMatchingCandidate } from "@corens/domain";

type MatchingServiceDependencies = {
  config: {
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
  };
};

export class MatchingService {
  constructor(private readonly deps: MatchingServiceDependencies) {}

  evaluate(self: MatchingCandidate, candidate: MatchingCandidate) {
    return evaluateMatchingCandidate(
      {
        self,
        candidate,
        moodScore: 0,
        intentScore: 0,
        moodUpdatedRecently: false,
        hasPairExclusion: false,
        hasActivePairMatch: false
      },
      this.deps.config
    );
  }
}
