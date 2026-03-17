import { describe, expect, it } from "vitest";
import { validateTelegramInitData } from "../../packages/telegram/src/lib/init-data";
import { createTelegramInitData } from "../helpers/telegram-init-data";

describe("validateTelegramInitData", () => {
  const botToken = "telegram-bot-token";

  it("accepts valid signed init data", () => {
    const rawInitData = createTelegramInitData({
      botToken,
      user: {
        id: 42,
        username: "corens_user"
      }
    });

    expect(validateTelegramInitData(rawInitData, botToken)).toMatchObject({
      isValid: true,
      userId: "42",
      username: "corens_user"
    });
  });

  it("rejects stale init data", () => {
    const rawInitData = createTelegramInitData({
      authDate: Math.floor(Date.now() / 1000) - 900,
      botToken,
      user: {
        id: 42
      }
    });

    expect(validateTelegramInitData(rawInitData, botToken).reason).toBe("stale_auth_date");
  });

  it("rejects tampered init data", () => {
    const rawInitData = createTelegramInitData({
      botToken,
      user: {
        id: 42
      }
    }).replace("42", "43");

    expect(validateTelegramInitData(rawInitData, botToken).reason).toBe("invalid_hash");
  });
});
