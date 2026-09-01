import { describe, expect, it, vi } from "vitest";
import { ProfileController } from "../../apps/api/src/profile.controller";

const notificationId = "123e4567-e89b-42d3-a456-426614174000";

describe("notification cleanup request wiring", () => {
  it("routes one validated notification id for the authenticated Telegram user", async () => {
    const cleanupNotification = vi.fn().mockResolvedValue(undefined);
    const cleanupNotifications = vi.fn().mockResolvedValue(undefined);
    const controller = new ProfileController(
      {} as never,
      { cleanupNotification, cleanupNotifications } as never
    );

    await controller.cleanupNotifications(
      { telegramUserId: "42" } as never,
      { notificationId }
    );

    expect(cleanupNotification).toHaveBeenCalledWith("42", notificationId);
    expect(cleanupNotifications).not.toHaveBeenCalled();
  });

  it("rejects a malformed notification id", async () => {
    const controller = new ProfileController(
      {} as never,
      {
        cleanupNotification: vi.fn().mockResolvedValue(undefined),
        cleanupNotifications: vi.fn().mockResolvedValue(undefined)
      } as never
    );

    await expect(
      controller.cleanupNotifications(
        { telegramUserId: "42" } as never,
        { notificationId: "match-1" }
      )
    ).rejects.toThrow("notificationId");
  });
});
