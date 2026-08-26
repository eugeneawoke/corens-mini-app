import { beforeEach, describe, expect, it, vi } from "vitest";
import { BotNotificationService } from "../../apps/api/src/telegram/bot-notification.service";
import { BotWebhookService } from "../../apps/api/src/telegram/bot-webhook.service";

describe("conversation-focused Telegram copy", () => {
  beforeEach(() => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "123456:test-token");
    vi.stubEnv("TELEGRAM_BOT_WEBHOOK_SECRET", "webhook-secret");
    vi.stubEnv("TELEGRAM_BOT_USERNAME", "corens_test_bot");
    vi.stubEnv("TELEGRAM_MINI_APP_URL", "https://example.test");
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test");
    vi.stubEnv("REDIS_URL", "redis://localhost:6379");
    vi.stubEnv("SESSION_SECRET", "test-session-secret");
  });

  it("orients /start around the conversation the person needs now", async () => {
    const webhook = new BotWebhookService();
    const calls: Array<{ method: string; payload: Record<string, unknown> }> = [];
    webhook.getBot().api.config.use(async (_previous, method, payload) => {
      calls.push({ method, payload: payload as Record<string, unknown> });
      return {
        ok: true,
        result: {
          message_id: 2,
          date: 0,
          chat: { id: 42, type: "private" },
          text: String((payload as { text?: string }).text ?? "")
        }
      } as never;
    });
    webhook.getBot().botInfo = {
      id: 123456,
      is_bot: true,
      first_name: "Corens",
      username: "corens_test_bot",
      can_join_groups: false,
      can_read_all_group_messages: false,
      supports_inline_queries: false,
      can_connect_to_business: false,
      has_main_web_app: true
    };

    await webhook.getBot().handleUpdate({
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        chat: { id: 42, type: "private" },
        from: { id: 42, is_bot: false, first_name: "Test" },
        text: "/start",
        entities: [{ offset: 0, length: 6, type: "bot_command" }]
      }
    });

    expect(calls[0]?.method).toBe("sendMessage");
    expect(calls[0]?.payload.text).toBe(
      "Какого разговора тебе сейчас не хватает?\n\nCorens помогает найти человека, с которым такой разговор может состояться."
    );
  });

  it("keeps match and consent notifications focused on starting a conversation", async () => {
    const sendMessage = vi.fn().mockResolvedValue({ message_id: 10 });
    const service = new BotNotificationService(
      { getBot: () => ({ api: { sendMessage, deleteMessage: vi.fn() } }) } as never,
      {
        clientInstance: {
          botNotificationMessage: {
            create: vi.fn().mockResolvedValue(undefined),
            findMany: vi.fn().mockResolvedValue([]),
            deleteMany: vi.fn().mockResolvedValue({ count: 0 })
          }
        }
      } as never
    );

    await service.notifyConnectionCreated("42", "Анна", "match-1");
    await service.notifyContactRequest("42", "Анна", "match-1");
    await service.notifyPhotoRequest("42", "Анна", "match-1");
    await service.notifyConnectionClosed("42", "Анна");

    expect(sendMessage.mock.calls.map((call) => call[1])).toEqual([
      "Новый подходящий разговор: Анна. Посмотрите, почему Corens предложил вам поговорить.",
      "Анна: контакт для разговора готов к взаимному открытию. Решение остаётся за вами.",
      "Анна: есть запрос на открытие фото. Это отдельное решение и не влияет на согласие открыть контакт.",
      "Этот разговор больше не активен (Анна). Corens продолжит искать следующий подходящий контакт."
    ]);
  });
});
