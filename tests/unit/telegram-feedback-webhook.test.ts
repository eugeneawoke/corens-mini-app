import { beforeEach, describe, expect, it, vi } from "vitest";
import { BotWebhookService } from "../../apps/api/src/telegram/bot-webhook.service";
import type { ConversationFeedbackBotHandlerService } from "../../apps/api/src/modules/conversation-feedback/bot-handler.service";

describe("BotWebhookService conversation feedback wiring", () => {
  beforeEach(() => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "123456:test-token");
    vi.stubEnv("TELEGRAM_BOT_WEBHOOK_SECRET", "webhook-secret");
    vi.stubEnv("TELEGRAM_BOT_USERNAME", "corens_test_bot");
    vi.stubEnv("TELEGRAM_MINI_APP_URL", "https://example.test");
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test");
    vi.stubEnv("REDIS_URL", "redis://localhost:6379");
    vi.stubEnv("SESSION_SECRET", "test-session-secret");
  });

  it("registers feedback callbacks once before mounting the Telegram webhook", () => {
    const register = vi.fn();
    const get = vi.fn();
    const all = vi.fn();
    const post = vi.fn();
    const feedbackBotHandler = { register } as unknown as ConversationFeedbackBotHandlerService;
    const app = {
      get: vi.fn().mockReturnValue(feedbackBotHandler),
      getHttpAdapter: () => ({ getInstance: () => ({ get, all, post }) })
    };
    const webhook = new BotWebhookService();

    webhook.mount(app as never);
    webhook.mount(app as never);

    expect(app.get).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith(webhook.getBot());
    expect(post).toHaveBeenCalledWith(
      "/telegram/webhook",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
  });
});
