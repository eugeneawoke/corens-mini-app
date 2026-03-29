import type { NextFunction, Request, Response } from "express";
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { readAppEnv } from "@corens/config";
import { AppModule } from "./app.module";
import { BotWebhookService } from "./telegram/bot-webhook.service";
import { MaintenanceService } from "./maintenance/maintenance.service";
import { runPendingSqlMigrations } from "./migrations/sql-runner";

export async function bootstrapApiApp(): Promise<void> {
  const env = readAppEnv();
  const logger = new Logger("ApiBootstrap");

  await runPendingSqlMigrations();

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  });
  const instance = app.getHttpAdapter().getInstance();
  const botWebhook = app.get(BotWebhookService);
  const maintenance = app.get(MaintenanceService);

  instance.disable("x-powered-by");
  instance.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");
    next();
  });

  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: false,
      forbidUnknownValues: true
    })
  );
  app.enableCors({
    origin: [env.TELEGRAM_MINI_APP_URL, "http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true
  });
  botWebhook.mount(app);

  if (env.ENABLE_MAINTENANCE_SCHEDULER) {
    maintenance.start();
  } else {
    logger.log("Maintenance scheduler is disabled");
  }

  await app.listen(env.API_PORT);
  logger.log(`API listening on http://localhost:${env.API_PORT}/api/health`);
}
