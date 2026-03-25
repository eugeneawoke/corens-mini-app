import { Injectable, Logger } from "@nestjs/common";
import { InlineKeyboard } from "grammy";
import { readAppEnv } from "@corens/config";
import { BotWebhookService } from "./bot-webhook.service";

@Injectable()
export class BotNotificationService {
  private readonly logger = new Logger(BotNotificationService.name);
  private readonly miniAppUrl = readAppEnv().TELEGRAM_MINI_APP_URL;

  constructor(private readonly botWebhook: BotWebhookService) {}

  async notifyConnectionCreated(telegramUserId: string): Promise<void> {
    await this.send(telegramUserId, "Есть новая связь — кто-то рядом с вами. Загляните в приложение.");
  }

  async notifyContactRequest(telegramUserId: string): Promise<void> {
    await this.send(telegramUserId, "Ваш собеседник хочет обменяться контактами. Ответьте в приложении.");
  }

  async notifyPhotoRequest(telegramUserId: string): Promise<void> {
    await this.send(telegramUserId, "Ваш собеседник хочет увидеть ваше фото. Ответьте в приложении.");
  }

  async notifyConnectionClosed(telegramUserId: string): Promise<void> {
    await this.send(telegramUserId, "Эта связь завершилась. Не переживайте — новая встреча уже ищется.");
  }

  private async send(telegramUserId: string, text: string): Promise<void> {
    try {
      const keyboard = new InlineKeyboard().webApp("Открыть приложение", this.miniAppUrl);
      await this.botWebhook.getBot().api.sendMessage(telegramUserId, text, {
        reply_markup: keyboard
      });
    } catch (error) {
      this.logger.warn(`Failed to send notification to ${telegramUserId}: ${error}`);
    }
  }
}
