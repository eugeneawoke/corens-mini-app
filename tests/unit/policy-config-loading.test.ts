import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ProfileContentCategory, ProfileContentModerationConfig } from "@corens/config";
import { PolicyConfigService } from "../../apps/api/src/policy-config.service";

const minimalProfileContentConfig: ProfileContentModerationConfig = {
  version: "v1",
  normalization: {
    confusables: { "а": "a" },
    leetspeak: { "0": "o" }
  },
  categories: {
    abusive: { terms: [], phrases: [], patterns: [], exceptions: [] },
    contact: { terms: [], phrases: [], patterns: [], exceptions: [] },
    advertising: { terms: [], phrases: [], patterns: [], exceptions: [] }
  }
};

async function serviceWithProfileContentConfig(config: unknown) {
  const configRoot = await mkdtemp(join(tmpdir(), "corens-profile-content-config-"));
  const moderationDirectory = join(configRoot, "config/moderation");
  await mkdir(moderationDirectory, { recursive: true });
  await writeFile(
    join(moderationDirectory, "profile-content.v1.json"),
    JSON.stringify(config),
    "utf8"
  );

  const service = new PolicyConfigService();
  Object.defineProperty(service, "configRoot", { value: configRoot });

  return {
    service,
    cleanup: () => rm(configRoot, { recursive: true, force: true })
  };
}

describe("PolicyConfigService moderation loading", () => {
  it("loads the versioned profile-content rules and memoizes them", async () => {
    const service = new PolicyConfigService();

    const [first, second] = await Promise.all([
      service.getProfileContentRules(),
      service.getProfileContentRules()
    ]);

    expect(first).toBe(second);
    expect(first.version).toBe("v1");
    expect(first.categories.abusive.terms).toContain("дурак");
    expect(first.categories.contact.patterns).toContain("(?:https?://|www\\.)\\S+");
    expect(first.categories.contact.obfuscatedPatterns).toContain(
      "(?:^|[^\\p{L}\\p{N}_])t\\s*\\.\\s*m\\s*e\\s*/\\s*\\S+"
    );
  });

  it("preserves the existing report-request moderation rules", async () => {
    const service = new PolicyConfigService();

    await expect(service.getModerationRules()).resolves.toEqual({
      reportRequestsPerDay: 5
    });
  });

  it("rejects a malformed profile-content config before returning it to the classifier", async () => {
    const malformed = structuredClone(minimalProfileContentConfig) as unknown as {
      categories: { contact: { patterns?: unknown } };
    };
    malformed.categories.contact.patterns = "not-an-array";
    const { service, cleanup } = await serviceWithProfileContentConfig(malformed);

    try {
      await expect(service.getProfileContentRules()).rejects.toThrow(
        "Invalid profile content moderation configuration: categories.contact.patterns must be an array of strings"
      );
    } finally {
      await cleanup();
    }
  });

  it("rejects a malformed obfuscated-pattern list before returning it to the classifier", async () => {
    const malformed = structuredClone(minimalProfileContentConfig) as unknown as {
      categories: { contact: { obfuscatedPatterns?: unknown } };
    };
    malformed.categories.contact.obfuscatedPatterns = "not-an-array";
    const { service, cleanup } = await serviceWithProfileContentConfig(malformed);

    try {
      await expect(service.getProfileContentRules()).rejects.toThrow(
        "Invalid profile content moderation configuration: categories.contact.obfuscatedPatterns must be an array of strings"
      );
    } finally {
      await cleanup();
    }
  });

  it.each<ProfileContentCategory>(["abusive", "contact", "advertising"])(
    "rejects an invalid %s regex without echoing the configured expression",
    async (category) => {
      const config = structuredClone(minimalProfileContentConfig);
      config.categories[category].patterns = ["private-invalid-pattern-("];
      const { service, cleanup } = await serviceWithProfileContentConfig(config);

      try {
        const error = await service.getProfileContentRules().catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe(
          `Invalid profile content moderation configuration: categories.${category}.patterns[0] is not a valid regular expression`
        );
        expect((error as Error).message).not.toContain("private-invalid-pattern");
      } finally {
        await cleanup();
      }
    }
  );

  it.each<ProfileContentCategory>(["abusive", "contact", "advertising"])(
    "rejects an invalid %s obfuscated regex without echoing the configured expression",
    async (category) => {
      const config = structuredClone(minimalProfileContentConfig) as unknown as {
        categories: Record<ProfileContentCategory, { obfuscatedPatterns?: string[] }>;
      };
      config.categories[category].obfuscatedPatterns = ["private-invalid-obfuscated-pattern-("];
      const { service, cleanup } = await serviceWithProfileContentConfig(config);

      try {
        const error = await service.getProfileContentRules().catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe(
          `Invalid profile content moderation configuration: categories.${category}.obfuscatedPatterns[0] is not a valid regular expression`
        );
        expect((error as Error).message).not.toContain("private-invalid-obfuscated-pattern");
      } finally {
        await cleanup();
      }
    }
  );
});
