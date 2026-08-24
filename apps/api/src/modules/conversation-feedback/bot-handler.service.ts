import { Injectable } from "@nestjs/common";
import { Bot, InlineKeyboard } from "grammy";
import type {
  ConversationFeedbackBotAnswer,
  ConversationFeedbackBotNextStep
} from "./service";
import { ConversationFeedbackService } from "./service";

const CALLBACK_PATTERN = /^cf:([ovbn]):([A-Za-z0-9_-]{32}):([0-4])$/;

const CALLBACK_ANSWERS: Record<string, ConversationFeedbackBotAnswer> = {
  "o:0": { step: "outcome", value: "talked" },
  "o:1": { step: "outcome", value: "wrote_no_reply" },
  "o:2": { step: "outcome", value: "did_not_write" },
  "o:3": { step: "outcome", value: "declined_after_match" },
  "o:4": { step: "outcome", value: "technical_issue" },
  "v:0": { step: "value", value: "yes" },
  "v:1": { step: "value", value: "partly" },
  "v:2": { step: "value", value: "no" },
  "b:0": { step: "obstacle", value: "bad_timing" },
  "b:1": { step: "obstacle", value: "poor_fit" },
  "b:2": { step: "obstacle", value: "did_not_know_how_to_start" },
  "b:3": { step: "obstacle", value: "insufficient_safety" },
  "b:4": { step: "obstacle", value: "technical_issue" },
  "n:0": { step: "next_intent", value: "now" },
  "n:1": { step: "next_intent", value: "later" },
  "n:2": { step: "next_intent", value: "not_now" }
};

export interface ConversationFeedbackBotPrompt {
  text: string;
  replyMarkup: InlineKeyboard | undefined;
}

@Injectable()
export class ConversationFeedbackBotHandlerService {
  readonly unavailableText = "Этот ответ больше недоступен.";

  constructor(private readonly conversationFeedback: ConversationFeedbackService) {}

  register(bot: Bot): void {
    bot.callbackQuery(/^cf:/, async (context) => {
      try {
        const prompt = await this.handleCallback(
          context.callbackQuery.data,
          String(context.from.id)
        );

        if (!prompt) {
          await context.answerCallbackQuery({
            text: this.unavailableText,
            show_alert: true
          });
          return;
        }

        await context.answerCallbackQuery();
        await context.editMessageText(
          prompt.text,
          prompt.replyMarkup ? { reply_markup: prompt.replyMarkup } : undefined
        );
      } catch {
        await context.answerCallbackQuery({
          text: this.unavailableText,
          show_alert: true
        });
      }
    });
  }

  async sendOutcomeQuestion(
    bot: Bot,
    telegramUserId: string,
    callbackToken: string
  ): Promise<void> {
    const prompt = this.createOutcomePrompt(callbackToken);
    await bot.api.sendMessage(telegramUserId, prompt.text, {
      reply_markup: prompt.replyMarkup
    });
  }

  async handleCallback(
    callbackData: string,
    telegramUserId: string
  ): Promise<ConversationFeedbackBotPrompt | null> {
    const parsed = CALLBACK_PATTERN.exec(callbackData);
    if (!parsed) return null;

    const [, stepCode, callbackToken, answerCode] = parsed;
    const answer = CALLBACK_ANSWERS[`${stepCode}:${answerCode}`];
    if (!answer || !callbackToken) return null;

    const result = await this.conversationFeedback.submitBotAnswer(
      callbackToken,
      telegramUserId,
      answer
    );
    if (!result.accepted || !result.nextStep) return null;

    return this.createPrompt(result.nextStep, callbackToken);
  }

  createOutcomePrompt(callbackToken: string): ConversationFeedbackBotPrompt {
    return {
      text: "Что произошло после того, как вы оба согласились открыть контакт?",
      replyMarkup: new InlineKeyboard()
        .text("Поговорили", `cf:o:${callbackToken}:0`)
        .row()
        .text("Я написал(а), но ответа не было", `cf:o:${callbackToken}:1`)
        .row()
        .text("Я не написал(а)", `cf:o:${callbackToken}:2`)
        .row()
        .text("Решил(а) не продолжать", `cf:o:${callbackToken}:3`)
        .row()
        .text("Возникла техническая проблема", `cf:o:${callbackToken}:4`)
    };
  }

  private createPrompt(
    step: ConversationFeedbackBotNextStep,
    callbackToken: string
  ): ConversationFeedbackBotPrompt {
    switch (step) {
      case "outcome":
        return this.createOutcomePrompt(callbackToken);
      case "value":
        return {
          text: "Насколько это был тот разговор, которого тебе не хватало?",
          replyMarkup: new InlineKeyboard()
            .text("Да, именно тот", `cf:v:${callbackToken}:0`)
            .row()
            .text("Отчасти", `cf:v:${callbackToken}:1`)
            .row()
            .text("Нет", `cf:v:${callbackToken}:2`)
        };
      case "obstacle":
        return {
          text: "Что больше всего помешало начать разговор?",
          replyMarkup: new InlineKeyboard()
            .text("Было не вовремя", `cf:b:${callbackToken}:0`)
            .row()
            .text("Человек или запрос не подошли", `cf:b:${callbackToken}:1`)
            .row()
            .text("Не знал(а), как начать", `cf:b:${callbackToken}:2`)
            .row()
            .text("Не хватило ощущения безопасности", `cf:b:${callbackToken}:3`)
            .row()
            .text("Помешала техническая проблема", `cf:b:${callbackToken}:4`)
        };
      case "next_intent":
        return {
          text: "Хотел(а) бы ты, чтобы Corens подобрал следующий разговор?",
          replyMarkup: new InlineKeyboard()
            .text("Да, сейчас", `cf:n:${callbackToken}:0`)
            .row()
            .text("Да, но позже", `cf:n:${callbackToken}:1`)
            .row()
            .text("Пока нет", `cf:n:${callbackToken}:2`)
        };
      case "completed":
        return {
          text: "Спасибо за обратную связь. Она помогает Corens находить не просто совпадения, а разговоры, которые действительно нужны.",
          replyMarkup: undefined
        };
    }
  }
}
