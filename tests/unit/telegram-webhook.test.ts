import { describe, expect, it } from "vitest";
import { verifyTelegramWebhookSecret } from "../../packages/telegram/src/lib/webhook";

describe("verifyTelegramWebhookSecret", () => {
  it("accepts the expected webhook secret", () => {
    expect(verifyTelegramWebhookSecret("secret", "secret")).toBe(true);
  });

  it("rejects a different webhook secret", () => {
    expect(verifyTelegramWebhookSecret("secret", "other")).toBe(false);
  });

  it("rejects a missing webhook secret", () => {
    expect(verifyTelegramWebhookSecret(undefined, "secret")).toBe(false);
  });
});
