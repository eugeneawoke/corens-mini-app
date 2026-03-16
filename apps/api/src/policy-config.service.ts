import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Injectable } from "@nestjs/common";
import type {
  BeaconRulesConfig,
  MatchingScoringConfig,
  PrivacyRulesConfig,
  RetentionPoliciesConfig
} from "@corens/config";

@Injectable()
export class PolicyConfigService {
  private matchingScoringPromise: Promise<MatchingScoringConfig> | undefined;
  private beaconRulesPromise: Promise<BeaconRulesConfig> | undefined;
  private privacyRulesPromise: Promise<PrivacyRulesConfig> | undefined;
  private retentionPoliciesPromise: Promise<RetentionPoliciesConfig> | undefined;
  private moderationRulesPromise: Promise<{ reportRequestsPerDay: number }> | undefined;

  getMatchingScoring(): Promise<MatchingScoringConfig> {
    this.matchingScoringPromise ??= this.loadMatchingScoring();
    return this.matchingScoringPromise;
  }

  getBeaconRules(): Promise<BeaconRulesConfig> {
    this.beaconRulesPromise ??= this.loadBeaconRules();
    return this.beaconRulesPromise;
  }

  getPrivacyRules(): Promise<PrivacyRulesConfig> {
    this.privacyRulesPromise ??= this.loadPrivacyRules();
    return this.privacyRulesPromise;
  }

  getRetentionPolicies(): Promise<RetentionPoliciesConfig> {
    this.retentionPoliciesPromise ??= this.loadRetentionPolicies();
    return this.retentionPoliciesPromise;
  }

  getModerationRules(): Promise<{ reportRequestsPerDay: number }> {
    this.moderationRulesPromise ??= this.loadModerationRules();
    return this.moderationRulesPromise;
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
      }
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

  private async loadModerationRules(): Promise<{ reportRequestsPerDay: number }> {
    const raw = await this.readLines("config/moderation/rules.v1.yaml");

    return {
      reportRequestsPerDay: this.readNumber(raw, "limits.report_requests_per_day")
    };
  }

  private async readLines(relativePath: string): Promise<string[]> {
    const content = await readFile(resolve(process.cwd(), relativePath), "utf8");
    return content.split("\n");
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
}
