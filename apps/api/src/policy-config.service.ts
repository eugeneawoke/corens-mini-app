import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Injectable } from "@nestjs/common";
import type {
  BeaconRulesConfig,
  MatchingIntentMatrixConfig,
  MatchingScoringConfig,
  MatchingStateMatrixConfig,
  PrivacyRulesConfig,
  RevealRulesConfig,
  RetentionPoliciesConfig
} from "@corens/config";

@Injectable()
export class PolicyConfigService {
  private readonly configRoot = this.resolveConfigRoot();
  private matchingScoringPromise: Promise<MatchingScoringConfig> | undefined;
  private matchingStateMatrixPromise: Promise<MatchingStateMatrixConfig> | undefined;
  private matchingIntentMatrixPromise: Promise<MatchingIntentMatrixConfig> | undefined;
  private beaconRulesPromise: Promise<BeaconRulesConfig> | undefined;
  private privacyRulesPromise: Promise<PrivacyRulesConfig> | undefined;
  private revealRulesPromise: Promise<RevealRulesConfig> | undefined;
  private retentionPoliciesPromise: Promise<RetentionPoliciesConfig> | undefined;
  private moderationRulesPromise: Promise<{ reportRequestsPerDay: number }> | undefined;

  getMatchingScoring(): Promise<MatchingScoringConfig> {
    this.matchingScoringPromise ??= this.memoizeWithRetry(
      () => this.loadMatchingScoring(),
      () => {
        this.matchingScoringPromise = undefined;
      }
    );
    return this.matchingScoringPromise;
  }

  getMatchingStateMatrix(): Promise<MatchingStateMatrixConfig> {
    this.matchingStateMatrixPromise ??= this.memoizeWithRetry(
      () => this.loadMatchingStateMatrix(),
      () => {
        this.matchingStateMatrixPromise = undefined;
      }
    );
    return this.matchingStateMatrixPromise;
  }

  getMatchingIntentMatrix(): Promise<MatchingIntentMatrixConfig> {
    this.matchingIntentMatrixPromise ??= this.memoizeWithRetry(
      () => this.loadMatchingIntentMatrix(),
      () => {
        this.matchingIntentMatrixPromise = undefined;
      }
    );
    return this.matchingIntentMatrixPromise;
  }

  getBeaconRules(): Promise<BeaconRulesConfig> {
    this.beaconRulesPromise ??= this.memoizeWithRetry(
      () => this.loadBeaconRules(),
      () => {
        this.beaconRulesPromise = undefined;
      }
    );
    return this.beaconRulesPromise;
  }

  getPrivacyRules(): Promise<PrivacyRulesConfig> {
    this.privacyRulesPromise ??= this.memoizeWithRetry(
      () => this.loadPrivacyRules(),
      () => {
        this.privacyRulesPromise = undefined;
      }
    );
    return this.privacyRulesPromise;
  }

  getRevealRules(): Promise<RevealRulesConfig> {
    this.revealRulesPromise ??= this.memoizeWithRetry(
      () => this.loadRevealRules(),
      () => {
        this.revealRulesPromise = undefined;
      }
    );
    return this.revealRulesPromise;
  }

  getRetentionPolicies(): Promise<RetentionPoliciesConfig> {
    this.retentionPoliciesPromise ??= this.memoizeWithRetry(
      () => this.loadRetentionPolicies(),
      () => {
        this.retentionPoliciesPromise = undefined;
      }
    );
    return this.retentionPoliciesPromise;
  }

  getModerationRules(): Promise<{ reportRequestsPerDay: number }> {
    this.moderationRulesPromise ??= this.memoizeWithRetry(
      () => this.loadModerationRules(),
      () => {
        this.moderationRulesPromise = undefined;
      }
    );
    return this.moderationRulesPromise;
  }

  private memoizeWithRetry<T>(
    load: () => Promise<T>,
    reset: () => void
  ): Promise<T> {
    return load().catch((error) => {
      reset();
      throw error;
    });
  }

  private async loadMatchingScoring(): Promise<MatchingScoringConfig> {
    const raw = await this.readLines("config/matching/scoring.v1.yaml");

    return {
      version: this.readScalar(raw, "version") ?? "v1",
      weights: {
        mood: this.readNumber(raw, "weights.mood"),
        intent: this.readNumber(raw, "weights.intent"),
        trustOverlap: this.readNumber(raw, "weights.trust_overlap"),
        noConnectionsBonus: this.readNumber(raw, "weights.no_connections_bonus"),
        recentMoodBonus: this.readNumber(raw, "weights.recent_mood_bonus")
      },
      limits: {
        activeConnections: this.readNumber(raw, "limits.active_connections", 1)
      },
      cooldowns: {
        intentHours: this.readNumber(raw, "cooldowns.intent_hours"),
        pairRematchHours: this.readNumber(raw, "cooldowns.pair_rematch_hours")
      },
      timers: {
        activeMatchHours: this.readNumber(raw, "timers.active_match_hours")
      },
      freshness: {
        moodHours: this.readNumber(raw, "freshness.mood_hours")
      }
    };
  }

  private async loadMatchingStateMatrix(): Promise<MatchingStateMatrixConfig> {
    const raw = await this.readLines("config/matching/state-matrix.v1.yaml");

    return {
      version: this.readScalar(raw, "version") ?? "v1",
      categories: this.readKeyValueList(raw, "state_categories").reduce<Record<string, "light" | "shadow">>(
        (acc, item) => {
          const [key, value] = item.split("=");

          if (key && (value === "light" || value === "shadow")) {
            acc[key.trim()] = value;
          }

          return acc;
        },
        {}
      ),
      compatibility: this.readCompatibilityMap(raw, "compatibility")
    };
  }

  private async loadMatchingIntentMatrix(): Promise<MatchingIntentMatrixConfig> {
    const raw = await this.readLines("config/matching/intent-matrix.v1.yaml");

    return {
      version: this.readScalar(raw, "version") ?? "v1",
      compatibility: this.readCompatibilityMap(raw, "compatibility")
    };
  }

  private async loadBeaconRules(): Promise<BeaconRulesConfig> {
    const raw = await this.readLines("config/beacon/rules.v1.yaml");

    return {
      version: this.readScalar(raw, "version") ?? "v1",
      intervalsMinutes: this.readList(raw, "intervals_minutes").map((value) => Number(value)),
      cooldownMinutes: this.readNumber(raw, "cooldown_minutes"),
      activationsPerDay: this.readNumber(raw, "activations_per_day")
    };
  }

  private async loadPrivacyRules(): Promise<PrivacyRulesConfig> {
    const raw = await this.readLines("config/privacy/rules.v1.yaml");

    return {
      version: this.readScalar(raw, "version") ?? "v1",
      hiddenProfileClosesPendingConnection:
        this.readScalar(raw, "hidden_profile_closes_pending_connection") === "true",
      deletion: {
        revokeSessionsImmediately:
          this.readScalar(raw, "deletion.revoke_sessions_immediately") === "true",
        expireBeaconImmediately:
          this.readScalar(raw, "deletion.expire_beacon_immediately") === "true",
        closeOpenConsentsImmediately:
          this.readScalar(raw, "deletion.close_open_consents_immediately") === "true"
      }
    };
  }

  private async loadRetentionPolicies(): Promise<RetentionPoliciesConfig> {
    const raw = await this.readLines("config/retention/policies.v1.yaml");

    return {
      version: this.readScalar(raw, "version") ?? "v1",
      retention: {
        histories_months: this.readNumber(raw, "retention.histories_months"),
        match_sessions_days: this.readNumber(raw, "retention.match_sessions_days"),
        reveal_consents_days: this.readNumber(raw, "retention.reveal_consents_days"),
        beacon_sessions_days: this.readNumber(raw, "retention.beacon_sessions_days")
      }
    };
  }

  private async loadRevealRules(): Promise<RevealRulesConfig> {
    const raw = await this.readLines("config/reveal/rules.v1.yaml");

    return {
      version: this.readScalar(raw, "version") ?? "v1",
      channels: {
        contact: {
          requiresMutualConsent:
            this.readScalar(raw, "channels.contact.requires_mutual_consent") === "true",
          exposedArtifact: "telegram_deep_link",
          softWarningRequired:
            this.readScalar(raw, "channels.contact.soft_warning_required") === "true"
        },
        photo: {
          requiresMutualConsent:
            this.readScalar(raw, "channels.photo.requires_mutual_consent") === "true",
          exposedArtifact: "photo_asset"
        }
      }
    };
  }

  private async loadModerationRules(): Promise<{ reportRequestsPerDay: number }> {
    const raw = await this.readLines("config/moderation/rules.v1.yaml");

    return {
      reportRequestsPerDay: this.readNumber(raw, "limits.report_requests_per_day")
    };
  }

  private async readLines(relativePath: string): Promise<string[]> {
    const content = await readFile(resolve(this.configRoot, relativePath), "utf8");
    return content.split("\n");
  }

  private resolveConfigRoot(): string {
    const candidates = [
      process.cwd(),
      resolve(__dirname, "../../.."),
      resolve(__dirname, "../../../..")
    ];

    for (const candidate of candidates) {
      if (candidate && !candidate.endsWith("/apps/api")) {
        return candidate;
      }
    }

    return process.cwd();
  }

  private readScalar(lines: string[], key: string): string | undefined {
    const path = key.split(".");
    const prefix = "  ".repeat(path.length - 1);
    const needle = `${prefix}${path[path.length - 1]}:`;
    const line = lines.find((item) => item.startsWith(needle));

    return line?.split(":").slice(1).join(":").trim();
  }

  private readNumber(lines: string[], key: string, fallback = 0): number {
    const value = this.readScalar(lines, key);

    return value ? Number(value) : fallback;
  }

  private readList(lines: string[], key: string): string[] {
    const listHeaderIndex = lines.findIndex((item) => item.startsWith(`${key}:`));

    if (listHeaderIndex === -1) {
      return [];
    }

    const result: string[] = [];

    for (const line of lines.slice(listHeaderIndex + 1)) {
      if (!line.startsWith("  - ")) {
        break;
      }

      result.push(line.replace("  - ", "").trim());
    }

    return result;
  }

  private readKeyValueList(lines: string[], key: string): string[] {
    return this.readList(lines, key);
  }

  private readCompatibilityMap(lines: string[], key: string): Record<string, number> {
    return this.readList(lines, key).reduce<Record<string, number>>((acc, item) => {
      const [pair, score] = item.split("=");

      if (!pair || !score) {
        return acc;
      }

      const [left, right] = pair.split("|").map((value) => value.trim());

      if (!left || !right) {
        return acc;
      }

      acc[this.makePairKey(left, right)] = Number(score.trim());
      acc[this.makePairKey(right, left)] = Number(score.trim());
      return acc;
    }, {});
  }

  private makePairKey(left: string, right: string): string {
    return `${left}::${right}`;
  }
}
