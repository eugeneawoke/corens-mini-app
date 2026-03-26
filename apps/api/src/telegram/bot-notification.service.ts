import { Injectable, Logger } from "@nestjs/common";
import { InlineKeyboard } from "grammy";
import { readAppEnv } from "@corens/config";
import { PrismaService } from "../prisma.service";
import { BotWebhookService } from "./bot-webhook.service";

@Injectable()
export class BotNotificationService {
  private readonly logger = new Logger(BotNotificationService.name);
  private readonly miniAppUrl = readAppEnv().TELEGRAM_MINI_APP_URL;

  constructor(
    private readonly botWebhook: BotWebhookService,
    private readonly prisma: PrismaService
  ) {}

  async notifyConnectionCreated(telegramUserId: string, peerName: string): Promise<void> {
    await this.send(telegramUserId, `Новая связь с ${peerName} — загляните в приложение.`);
  }

  async notifyContactRequest(telegramUserId: string, peerName: string): Promise<void> {
    await this.send(telegramUserId, `${peerName} хочет обменяться контактами. Ответьте в приложении.`);
  }

  async notifyPhotoRequest(telegramUserId: string, peerName: string): Promise<void> {
    await this.send(telegramUserId, `${peerName} хочет увидеть ваше фото. Ответьте в приложении.`);
  }

  async notifyConnectionClosed(telegramUserId: string): Promise<void> {
    await this.send(telegramUserId, "Эта связь завершилась. Не переживайте — новая встреча уже ищется.");
  }

  async cleanupNotifications(telegramUserId: string): Promise<void> {
    const messages = await this.prisma.clientInstance.botNotificationMessage.findMany({
      where: { telegramUserId }
    });

    if (messages.length === 0) return;

    await this.prisma.clientInstance.botNotificationMessage.deleteMany({
      where: { telegramUserId }
    });

    for (const msg of messages) {
      try {
        await this.botWebhook.getBot().api.deleteMessage(telegramUserId, msg.messageId);
      } catch {
        // Message may already be deleted or older than 48h — ignore silently
      }
    }
  }

  private async send(telegramUserId: string, text: string): Promise<void> {
    try {
      const keyboard = new InlineKeyboard().webApp("Открыть приложение", this.miniAppUrl);
      const message = await this.botWebhook.getBot().api.sendMessage(telegramUserId, text, {
        reply_markup: keyboard
      });
      await this.prisma.clientInstance.botNotificationMessage.create({
        data: { telegramUserId, messageId: message.message_id }
      });
    } catch (error) {
      this.logger.warn(`Failed to send notification to ${telegramUserId}: ${error}`);
    }
  }
}
