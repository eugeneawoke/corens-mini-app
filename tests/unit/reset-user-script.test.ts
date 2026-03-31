import { describe, expect, it, vi } from "vitest";
import {
  buildResetFollowupMessage,
  parseResetUserArgs,
  runResetUserCommand
} from "../../apps/api/src/scripts/reset-user";

describe("reset-user script", () => {
  it("requires userId argument", () => {
    expect(() => parseResetUserArgs([])).toThrow("Missing required --user-id argument");
  });

  it("supports --user-id=value syntax", () => {
    expect(parseResetUserArgs(["--user-id=cmnecrlqw0005rz0m88k00ngi"])).toEqual({
      userId: "cmnecrlqw0005rz0m88k00ngi"
    });
  });

  it("fails when active user was not found", async () => {
    const log = vi.fn();

    await expect(
      runResetUserCommand(["--user-id=missing"], {
        findTargetById: async () => null,
        resetUserById: async () => undefined,
        sendOneOffServiceMessage: async () => undefined,
        log
      })
    ).rejects.toThrow("Active user missing was not found");
  });

  it("resets the user and sends a one-off Telegram notification", async () => {
    const log = vi.fn();
    const resetUserById = vi.fn(async () => undefined);
    const sendOneOffServiceMessage = vi.fn(async () => undefined);

    await runResetUserCommand(["--user-id", "cmnecrlqw0005rz0m88k00ngi"], {
      findTargetById: async () => ({
        id: "cmnecrlqw0005rz0m88k00ngi",
        status: "active",
        telegramUserId: "42",
        displayName: "Евгений"
      }),
      resetUserById,
      sendOneOffServiceMessage,
      log
    });

    expect(resetUserById).toHaveBeenCalledWith("cmnecrlqw0005rz0m88k00ngi");
    expect(sendOneOffServiceMessage).toHaveBeenCalledWith(
      "42",
      expect.stringContaining("Привет! Евгений")
    );
    expect(log).toHaveBeenCalledWith("User cmnecrlqw0005rz0m88k00ngi found");
    expect(log).toHaveBeenCalledWith("Reset completed for cmnecrlqw0005rz0m88k00ngi");
    expect(log).toHaveBeenCalledWith("Telegram notification sent to 42");
  });

  it("builds a user-facing follow-up message with the March changelog summary", () => {
    const message = buildResetFollowupMessage("Евгений");

    expect(message).toContain("Привет! Евгений");
    expect(message).toContain("😉");
    expect(message).toContain("🙂");
    expect(message).toContain("🙏");
    expect(message).toContain("убрал лишние или запутывающие элементы из пути пользователя");
    expect(message).toContain("улучшил Telegram-уведомления и открытие контактов внутри mini app");
  });
});
