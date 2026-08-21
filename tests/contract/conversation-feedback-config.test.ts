import { describe, expect, it } from "vitest";
import { PolicyConfigService } from "../../apps/api/src/policy-config.service";

describe("conversation feedback policy", () => {
  it("loads versioned timing and delivery rules", async () => {
    const service = new PolicyConfigService();

    await expect(service.getConversationFeedbackRules()).resolves.toEqual({
      version: "v1",
      timing: {
        afterContactOpenHours: 24,
        withoutContactOpenHours: 48,
        expiresAfterDays: 7
      },
      delivery: {
        reminderEnabled: false,
        maxPromptAttempts: 3
      }
    });
  });
});
