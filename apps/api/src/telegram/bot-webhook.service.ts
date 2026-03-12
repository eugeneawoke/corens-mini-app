import type { Request, Response, NextFunction } from "express";
import { Injectable, Logger } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { readAppEnv } from "@corens/config";
import { verifyTelegramWebhookSecret } from "@corens/telegram";
import { Bot, InlineKeyboard, webhookCallback } from "grammy";

@Injectable()
export class BotWebhookService {
  private readonly logger = new Logger(BotWebhookService.name);
  private readonly env = readAppEnv();
  private readonly bot = new Bot(this.env.TELEGRAM_BOT_TOKEN);
  private mounted = false;

  constructor() {
    this.bot.command("start", async (context) => {
      const keyboard = new InlineKeyboard().webApp("Open Mini App", this.env.TELEGRAM_MINI_APP_URL);

      await context.reply("corens bot foundation is running.", {
        reply_markup: keyboard
      });
    });
  }

  mount(app: INestApplication): void {
    if (this.mounted) {
      return;
    }

    const instance = app.getHttpAdapter().getInstance();

    instance.get("/bot/health", (_req: Request, res: Response) => {
      res.json({
        ok: true,
        service: "bot-webhook"
      });
    });

    instance.use("/telegram/webhook", (req: Request, res: Response, next: NextFunction) => {
      const receivedSecret = req.header("x-telegram-bot-api-secret-token");

      if (!verifyTelegramWebhookSecret(receivedSecret, this.env.TELEGRAM_BOT_WEBHOOK_SECRET)) {
        res.status(401).json({
          ok: false,
          code: "invalid_webhook_secret"
        });
        return;
      }

      next();
    });
    instance.use("/telegram/webhook", webhookCallback(this.bot, "express"));

    this.mounted = true;
    this.logger.log("Telegram webhook mounted at /telegram/webhook");
  }
}
