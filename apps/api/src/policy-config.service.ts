import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Injectable } from "@nestjs/common";
import type { BeaconRulesConfig, MatchingScoringConfig } from "@corens/config";

@Injectable()
export class PolicyConfigService {
  private matchingScoringPromise: Promise<MatchingScoringConfig> | undefined;
  private beaconRulesPromise: Promise<BeaconRulesConfig> | undefined;

  getMatchingScoring(): Promise<MatchingScoringConfig> {
    this.matchingScoringPromise ??= this.loadMatchingScoring();
    return this.matchingScoringPromise;
  }

  getBeaconRules(): Promise<BeaconRulesConfig> {
    this.beaconRulesPromise ??= this.loadBeaconRules();
    return this.beaconRulesPromise;
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
