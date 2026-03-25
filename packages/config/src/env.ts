import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  APP_ENV: z.string().default("local"),
  APP_NAME: z.string().default("corens-mini-app"),
  API_PORT: z.coerce.number().default(4000),
  BOT_PORT: z.coerce.number().default(4100),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_BOT_WEBHOOK_SECRET: z.string().min(1),
  TELEGRAM_BOT_USERNAME: z.string().min(1),
  TELEGRAM_MINI_APP_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(1),
  B2_KEY_ID: z.string().optional().default(""),
  B2_APPLICATION_KEY: z.string().optional().default(""),
  B2_BUCKET_ID: z.string().optional().default(""),
  B2_BUCKET_NAME: z.string().optional().default(""),
  B2_ENDPOINT: z.string().optional().default(""),
  B2_PUBLIC_BASE_URL: z.string().optional().default("")
});

export type AppEnv = z.infer<typeof envSchema>;

export function readAppEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  loadMonorepoEnv();
  return envSchema.parse(source);
}

function loadMonorepoEnv(): void {
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "..", ".env"),
    resolve(process.cwd(), "..", "..", ".env")
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate) && typeof process.loadEnvFile === "function") {
      process.loadEnvFile(candidate);
      return;
    }
  }
}
