import type { Request, Response, NextFunction } from "express";
import express from "express";
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
    const webhook = webhookCallback(this.bot, "express");

    instance.get("/bot/health", (_req: Request, res: Response) => {
      res.json({
        ok: true,
        service: "bot-webhook"
      });
    });

    instance.all("/telegram/webhook", (req: Request, res: Response, next: NextFunction) => {
      if (req.method !== "POST") {
        res.status(405).json({
          ok: false,
          code: "method_not_allowed"
        });
        return;
      }

      next();
    });
    instance.post(
      "/telegram/webhook",
      express.json(),
      (req: Request, res: Response, next: NextFunction) => {
        const receivedSecret = req.header("x-telegram-bot-api-secret-token");

        if (!verifyTelegramWebhookSecret(receivedSecret, this.env.TELEGRAM_BOT_WEBHOOK_SECRET)) {
          res.status(401).json({
            ok: false,
            code: "invalid_webhook_secret"
          });
          return;
        }

        next();
      },
      (req: Request, res: Response, next: NextFunction) => {
        if (!req.body || typeof req.body !== "object" || typeof req.body.update_id !== "number") {
          this.logger.warn(
            `Rejected malformed Telegram webhook payload: method=${req.method} content-type=${req.header("content-type") ?? "unknown"}`
          );
          res.status(400).json({
            ok: false,
            code: "invalid_webhook_payload"
          });
          return;
        }

        next();
      },
      webhook
    );

    this.mounted = true;
    this.logger.log("Telegram webhook mounted at /telegram/webhook");
  }
}
