import "reflect-metadata";
import { PrivacyRuntimeService } from "../modules/privacy/runtime.service";
import { MediaService } from "../modules/media/service";
import { PrismaService } from "../prisma.service";
import { PolicyConfigService } from "../policy-config.service";
import { BotWebhookService } from "../telegram/bot-webhook.service";
import { BotNotificationService } from "../telegram/bot-notification.service";

type ResetTarget = {
  id: string;
  status: string;
  telegramUserId: string;
  displayName: string;
};

type ResetUserCommandDeps = {
  findTargetById(userId: string): Promise<ResetTarget | null>;
  resetUserById(userId: string): Promise<void>;
  sendOneOffServiceMessage(telegramUserId: string, text: string): Promise<void>;
  log(message: string): void;
};

export function parseResetUserArgs(argv: string[]): { userId: string } {
  let userId = "";

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (current === "--user-id") {
      userId = argv[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (current.startsWith("--user-id=")) {
      userId = current.slice("--user-id=".length);
    }
  }

  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    throw new Error("Missing required --user-id argument");
  }

  return { userId: normalizedUserId };
}

export function buildResetFollowupMessage(displayName: string): string {
  return [
    `Привет! ${displayName}, я бесконечно благодарен за честную и внимательную обратную связь и поддержку в моем начинании!`,
    "",
    "Я действительно очень ценю, что тебе было интересно пройти этот путь, что удалось подсветить многие места, на которые я не обратил внимание, что было неудобно, не понятно или ломалось.",
    "",
    "Я учёл все пожелания и уже всё исправил 😉",
    "• упростил и сделал понятнее первый вход и стартовые экраны",
    "• поправил шаги онбординга, чтобы путь проходился ровнее и без лишних затыков",
    "• сделал стабильнее связи, Beacon и переходы внутри приложения",
    "• исправил проблемы со сбросом, удалением и повторным началом пути",
    "• укрепил работу с фото: загрузку, удаление и безопасность",
    "• улучшил Telegram-уведомления и открытие контактов внутри mini app",
    "",
    "Буду максимально признателен, если есть возможность ещё раз пройти весь путь пользователя с самого начала. Я почистил некоторые данные, чтобы новый вход был для каждого как будто в первый раз 🙂",
    "",
    "Если будут замечены еще какие то недоработки и любые проблемы, возникнут вопросы или идеи, пожалуйста, напиши мне об этом @eugenegusakov",
    "",
    "Твоя помощь сейчас очень важна и правда сильно помогает мне сделать продукт лучше. Спасибо еще раз за участие и доверие 🙏"
  ].join("\n");
}

export async function runResetUserCommand(
  argv: string[],
  deps: ResetUserCommandDeps
): Promise<void> {
  const { userId } = parseResetUserArgs(argv);
  const target = await deps.findTargetById(userId);

  if (!target) {
    throw new Error(`Active user ${userId} was not found`);
  }

  await deps.resetUserById(target.id);
  await deps.sendOneOffServiceMessage(
    target.telegramUserId,
    buildResetFollowupMessage(target.displayName)
  );

  deps.log(`User ${target.id} found`);
  deps.log(`Reset completed for ${target.id}`);
  deps.log(`Telegram notification sent to ${target.telegramUserId}`);
}

async function createCommandDeps(): Promise<ResetUserCommandDeps & { close(): Promise<void> }> {
  const prisma = new PrismaService();
  const policyConfig = new PolicyConfigService();
  const botWebhook = new BotWebhookService();
  const notifications = new BotNotificationService(botWebhook, prisma);
  const media = new MediaService(prisma, {} as never, {} as never);
  const privacy = new PrivacyRuntimeService(prisma, policyConfig, media, notifications);

  return {
    findTargetById: async (userId: string) => {
      const user = await prisma.clientInstance.user.findUnique({
        where: { id: userId }
      });

      if (!user || user.status !== "active") {
        return null;
      }

      const profile = await prisma.clientInstance.profile.findUnique({
        where: { userId }
      });

      return {
        id: user.id,
        status: user.status,
        telegramUserId: user.telegramUserId,
        displayName: profile?.displayName?.trim() || user.telegramUsername || "Новый профиль"
      };
    },
    resetUserById: async (userId: string) => {
      await privacy.resetUserById(userId);
    },
    sendOneOffServiceMessage: async (telegramUserId: string, text: string) => {
      await notifications.sendOneOffServiceMessage(telegramUserId, text);
    },
    log: (message: string) => {
      console.log(message);
    },
    close: async () => {
      await prisma.onModuleDestroy();
    }
  };
}

async function main(): Promise<void> {
  const deps = await createCommandDeps();

  try {
    await runResetUserCommand(process.argv.slice(2), deps);
  } finally {
    await deps.close();
  }
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
