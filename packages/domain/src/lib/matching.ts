export interface MatchingCandidate {
  userId: string;
  stateKey: string;
  intentKey: string | null;
  trustKeys: string[];
  activeConnectionsCount: number;
  matchingEnabled: boolean;
  isHidden: boolean;
}

export interface MatchingScoreBreakdown {
  moodScore: number;
  intentScore: number;
  trustOverlapCount: number;
  noConnectionsBonus: number;
  recentMoodBonus: number;
}
