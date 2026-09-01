import { describe, expect, it, vi } from "vitest";
import { AuthController } from "../../apps/api/src/auth.controller";

describe("AuthController notification retention", () => {
  it("does not delete unrelated notifications during Mini App bootstrap", async () => {
    const response = {
      sessionToken: "session.token",
      expiresAt: "2026-09-02T00:00:00.000Z",
      user: {
        id: "user-1",
        telegramUserId: "42",
        telegramUsername: "alice"
      },
      profile: {
        onboardingCompleted: true
      }
    };
    const bootstrap = vi.fn().mockResolvedValue(response);
    const cleanupNotifications = vi.fn().mockResolvedValue(undefined);
    const controller = new (AuthController as unknown as {
      new (auth: unknown, notifications: unknown): AuthController;
    })(
      { bootstrap } as never,
      { cleanupNotifications } as never
    );

    await expect(controller.bootstrap({ initData: "signed-init-data" })).resolves.toBe(response);
    expect(cleanupNotifications).not.toHaveBeenCalled();
  });
});
