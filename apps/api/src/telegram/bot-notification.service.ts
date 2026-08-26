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

  async notifyConnectionCreated(
    telegramUserId: string,
    peerName: string,
    connectionId?: string
  ): Promise<void> {
    await this.send(
      telegramUserId,
      `Новый подходящий разговор: ${peerName}. Посмотрите, почему Corens предложил вам поговорить.`,
      this.notificationUrl(connectionId)
    );
  }

  async notifyContactRequest(
    telegramUserId: string,
    peerName: string,
    connectionId?: string
  ): Promise<void> {
    await this.send(
      telegramUserId,
      `${peerName}: контакт для разговора готов к взаимному открытию. Решение остаётся за вами.`,
      this.notificationUrl(connectionId)
    );
  }

  async notifyPhotoRequest(
    telegramUserId: string,
    peerName: string,
    connectionId?: string
  ): Promise<void> {
    await this.send(
      telegramUserId,
      `${peerName}: есть запрос на открытие фото. Это отдельное решение и не влияет на согласие открыть контакт.`,
      this.notificationUrl(connectionId)
    );
  }

  async notifyConnectionClosed(telegramUserId: string, peerName?: string): Promise<void> {
    await this.send(
      telegramUserId,
      peerName
        ? `Этот разговор больше не активен (${peerName}). Corens продолжит искать следующий подходящий контакт.`
        : "Этот разговор больше не активен. Corens продолжит искать следующий подходящий контакт.",
      this.notificationUrl()
    );
  }

  async sendOneOffServiceMessage(
    telegramUserId: string,
    text: string,
    url = this.miniAppUrl
  ): Promise<void> {
    await this.cleanupNotifications(telegramUserId);
    await this.send(telegramUserId, text, url);
  }

  async cleanupNotifications(telegramUserId: string): Promise<void> {
    const messages = await this.prisma.clientInstance.botNotificationMessage.findMany({
      where: { telegramUserId }
    });

    if (messages.length === 0) return;

    await this.prisma.clientInstance.botNotificationMessage.deleteMany({
      where: { telegramUserId }
    });

    await Promise.allSettled(
      messages.map((msg) =>
        this.botWebhook.getBot().api.deleteMessage(telegramUserId, msg.messageId)
      )
    );
  }

  private notificationUrl(connectionId?: string): string {
    return connectionId
      ? this.buildMiniAppUrl(`/connection/${encodeURIComponent(connectionId)}`)
      : this.buildMiniAppUrl("/connection");
  }

  private buildMiniAppUrl(pathname: string): string {
    const url = new URL(this.miniAppUrl);
    url.pathname = pathname;
    url.search = "";
    return url.toString();
  }

  private async send(telegramUserId: string, text: string, url = this.miniAppUrl): Promise<void> {
    try {
      const keyboard = new InlineKeyboard().webApp("Открыть приложение", url);
      const message = await this.botWebhook.getBot().api.sendMessage(telegramUserId, text, {
        reply_markup: keyboard
      });
      await this.prisma.clientInstance.botNotificationMessage.create({
        data: { telegramUserId, messageId: message.message_id }
      });
    } catch (error) {
      this.logger.error(
        `Failed to send Telegram notification to ${telegramUserId}: ${String(error)}`
      );
    }
  }
}
