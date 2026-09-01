import { beforeEach, describe, expect, it, vi } from "vitest";
import { BotNotificationService } from "../../apps/api/src/telegram/bot-notification.service";

const ownedMessage = {
  id: "notification-owned",
  telegramUserId: "42",
  messageId: 101
};

const foreignMessage = {
  id: "notification-foreign",
  telegramUserId: "84",
  messageId: 202
};

function createFixture() {
  const records = [ownedMessage, foreignMessage];
  const deleteMessage = vi.fn().mockResolvedValue(true);
  const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
  const findFirst = vi.fn(
    async ({ where }: { where: { id: string; telegramUserId: string } }) =>
      records.find(
        (record) =>
          record.id === where.id && record.telegramUserId === where.telegramUserId
      ) ?? null
  );
  const service = new BotNotificationService(
    { getBot: () => ({ api: { deleteMessage } }) } as never,
    {
      clientInstance: {
        botNotificationMessage: { findFirst, deleteMany }
      }
    } as never
  );

  return { service, deleteMessage, deleteMany };
}

describe("addressed Telegram notification cleanup", () => {
  beforeEach(() => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "123456:test-token");
    vi.stubEnv("TELEGRAM_BOT_WEBHOOK_SECRET", "webhook-secret");
    vi.stubEnv("TELEGRAM_BOT_USERNAME", "corens_test_bot");
    vi.stubEnv("TELEGRAM_MINI_APP_URL", "https://example.test");
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test");
    vi.stubEnv("REDIS_URL", "redis://localhost:6379");
    vi.stubEnv("SESSION_SECRET", "test-session-secret");
  });

  it("deletes only the owned Telegram message selected by notification id", async () => {
    const fixture = createFixture();

    await fixture.service.cleanupNotification("42", "notification-owned");

    expect(fixture.deleteMessage).toHaveBeenCalledOnce();
    expect(fixture.deleteMessage).toHaveBeenCalledWith("42", 101);
    expect(fixture.deleteMany).toHaveBeenCalledWith({
      where: { id: "notification-owned", telegramUserId: "42" }
    });
  });

  it("does not delete a notification owned by another Telegram user", async () => {
    const fixture = createFixture();

    await fixture.service.cleanupNotification("42", "notification-foreign");

    expect(fixture.deleteMessage).not.toHaveBeenCalled();
    expect(fixture.deleteMany).not.toHaveBeenCalled();
  });
});
