import { describe, expect, it } from "vitest";
import { PolicyConfigService } from "../../apps/api/src/policy-config.service";

describe("PolicyConfigService", () => {
  it("loads reveal rules from config", async () => {
    const service = new PolicyConfigService();
    const rules = await service.getRevealRules();

    expect(rules.channels.contact).toEqual({
      requiresMutualConsent: true,
      exposedArtifact: "telegram_deep_link",
      softWarningRequired: true
    });
    expect(rules.channels.photo).toEqual({
      requiresMutualConsent: true,
      exposedArtifact: "photo_asset"
    });
  });

  it("loads privacy deletion rules from config", async () => {
    const service = new PolicyConfigService();
    const rules = await service.getPrivacyRules();

    expect(rules.hiddenProfileClosesPendingConnection).toBe(false);
    expect(rules.deletion).toEqual({
      revokeSessionsImmediately: true,
      expireBeaconImmediately: true,
      closeOpenConsentsImmediately: true
    });
  });
});
