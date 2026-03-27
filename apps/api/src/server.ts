import { Logger } from "@nestjs/common";
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
  const botWebhook = app.get(BotWebhookService);
  const maintenance = app.get(MaintenanceService);

  app.setGlobalPrefix("api");
  app.enableCors({
    origin: [env.TELEGRAM_MINI_APP_URL, "http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true
  });
  botWebhook.mount(app);
  maintenance.start();

  await app.listen(env.API_PORT);
  logger.log(`API listening on http://localhost:${env.API_PORT}/api/health`);
}
