export interface MatchingScoringConfig {
  version: string;
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
  cooldowns: {
    trustKeysDays: number;
    intentHours: number;
  };
  freshness: {
    moodHours: number;
  };
}

export interface MatchingStateMatrixConfig {
  version: string;
  categories: Record<string, "light" | "shadow">;
  compatibility: Record<string, number>;
}

export interface MatchingIntentMatrixConfig {
  version: string;
  compatibility: Record<string, number>;
}

export interface BeaconRulesConfig {
  version: string;
  intervalsMinutes: number[];
  cooldownMinutes: number;
  activationsPerDay: number;
}

export interface RevealRulesConfig {
  version: string;
  channels: {
    contact: {
      requiresMutualConsent: boolean;
      exposedArtifact: "telegram_deep_link";
      softWarningRequired: boolean;
    };
    photo: {
      requiresMutualConsent: boolean;
      exposedArtifact: "photo_asset";
    };
  };
}

export interface RetentionPoliciesConfig {
  version: string;
  retention: Record<string, number>;
}

export interface PrivacyRulesConfig {
  version: string;
  hiddenProfileClosesPendingConnection: boolean;
  deletion: {
    revokeSessionsImmediately: boolean;
    expireBeaconImmediately: boolean;
    closeOpenConsentsImmediately: boolean;
  };
}
