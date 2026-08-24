import { describe, expect, it, vi } from "vitest";
import { ConversationFeedbackBotHandlerService } from "../../apps/api/src/modules/conversation-feedback/bot-handler.service";
import type { ConversationFeedbackService } from "../../apps/api/src/modules/conversation-feedback/service";

const TOKEN = "abcdefghijklmnopqrstuvwxyzABCDEF";

describe("ConversationFeedbackBotHandlerService", () => {
  it("sends the first outcome question without embedding participant or match identifiers", async () => {
    const sendMessage = vi.fn().mockResolvedValue({ message_id: 1 });
    const handler = new ConversationFeedbackBotHandlerService({} as ConversationFeedbackService);

    await handler.sendOutcomeQuestion(
      { api: { sendMessage } } as never,
      "telegram-actor-1",
      TOKEN
    );

    expect(sendMessage).toHaveBeenCalledWith(
      "telegram-actor-1",
      "Что произошло после того, как вы оба согласились открыть контакт?",
      expect.objectContaining({ reply_markup: expect.anything() })
    );
    const payload = JSON.stringify(sendMessage.mock.calls[0]?.[2]);
    expect(payload).not.toContain("telegram-actor-1");
    expect(payload).not.toContain("match-");
  });

  it("builds the exact outcome question with compact opaque callbacks", () => {
    const handler = new ConversationFeedbackBotHandlerService({} as ConversationFeedbackService);

    const prompt = handler.createOutcomePrompt(TOKEN);
    const callbackData = prompt.replyMarkup.inline_keyboard.flatMap((row) =>
      row.map((button) => ("callback_data" in button ? button.callback_data : ""))
    );

    expect(prompt.text).toBe(
      "Что произошло после того, как вы оба согласились открыть контакт?"
    );
    expect(callbackData).toEqual([
      `cf:o:${TOKEN}:0`,
      `cf:o:${TOKEN}:1`,
      `cf:o:${TOKEN}:2`,
      `cf:o:${TOKEN}:3`,
      `cf:o:${TOKEN}:4`
    ]);
    expect(callbackData.every((value) => Buffer.byteLength(value, "utf8") <= 64)).toBe(true);
    expect(callbackData.every((value) => !value.includes("match-") && !value.includes("telegram-"))).toBe(true);
  });

  it("maps the talked branch to the value question", async () => {
    const submitBotAnswer = vi.fn().mockResolvedValue({
      accepted: true,
      nextStep: "value"
    });
    const handler = new ConversationFeedbackBotHandlerService({
      submitBotAnswer
    } as unknown as ConversationFeedbackService);

    const result = await handler.handleCallback(`cf:o:${TOKEN}:0`, "telegram-actor-1");

    expect(submitBotAnswer).toHaveBeenCalledWith(
      TOKEN,
      "telegram-actor-1",
      { step: "outcome", value: "talked" }
    );
    expect(result?.text).toBe("Насколько это был тот разговор, которого тебе не хватало?");
    expect(result?.replyMarkup.inline_keyboard.flat().map((button) => button.text)).toEqual([
      "Да, именно тот",
      "Отчасти",
      "Нет"
    ]);
  });

  it("maps a no-conversation branch to the obstacle question", async () => {
    const submitBotAnswer = vi.fn().mockResolvedValue({
      accepted: true,
      nextStep: "obstacle"
    });
    const handler = new ConversationFeedbackBotHandlerService({
      submitBotAnswer
    } as unknown as ConversationFeedbackService);

    const result = await handler.handleCallback(`cf:o:${TOKEN}:1`, "telegram-actor-1");

    expect(submitBotAnswer).toHaveBeenCalledWith(
      TOKEN,
      "telegram-actor-1",
      { step: "outcome", value: "wrote_no_reply" }
    );
    expect(result?.text).toBe("Что больше всего помешало начать разговор?");
  });

  it("ends the third answer with the approved thank-you", async () => {
    const submitBotAnswer = vi.fn().mockResolvedValue({
      accepted: true,
      nextStep: "completed"
    });
    const handler = new ConversationFeedbackBotHandlerService({
      submitBotAnswer
    } as unknown as ConversationFeedbackService);

    const result = await handler.handleCallback(`cf:n:${TOKEN}:2`, "telegram-actor-1");

    expect(result).toEqual({
      text: "Спасибо за обратную связь. Она помогает Corens находить не просто совпадения, а разговоры, которые действительно нужны.",
      replyMarkup: undefined
    });
  });

  it("rejects malformed, stale, and unauthorized callbacks generically", async () => {
    const submitBotAnswer = vi.fn().mockResolvedValue({
      accepted: false,
      nextStep: null
    });
    const handler = new ConversationFeedbackBotHandlerService({
      submitBotAnswer
    } as unknown as ConversationFeedbackService);

    await expect(handler.handleCallback("cf:o:match-1:0", "telegram-actor-1")).resolves.toBeNull();
    await expect(
      handler.handleCallback(`cf:o:${TOKEN}:0`, "telegram-actor-2")
    ).resolves.toBeNull();
    expect(handler.unavailableText).toBe("Этот ответ больше недоступен.");
  });
});
