import { describe, expect, it } from "vitest";
import { PolicyConfigService } from "../../apps/api/src/policy-config.service";

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
  });

  it("preserves the existing report-request moderation rules", async () => {
    const service = new PolicyConfigService();

    await expect(service.getModerationRules()).resolves.toEqual({
      reportRequestsPerDay: 5
    });
  });
});
