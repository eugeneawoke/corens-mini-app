import { BadRequestException, Injectable } from "@nestjs/common";
import type {
  CompleteOnboardingRequest,
  ProfileSummary,
  UpdateStateIntentRequest,
  UpdateTrustKeysRequest
} from "@corens/domain";
import {
  intentOptions,
  planDeletion,
  stateOptions,
  trustKeyGroups
} from "@corens/domain";
import type { Profile, User } from "@corens/db";
import { PrismaService } from "../../prisma.service";

const DEMO_TELEGRAM_USER_ID = "demo-telegram-user";
const DEMO_TELEGRAM_USERNAME = "maria_user";
const privacyRules = {
  hiddenProfileClosesPendingConnection: false,
  deletion: {
    revokeSessionsImmediately: true,
    expireBeaconImmediately: true,
    closeOpenConsentsImmediately: true
  }
} as const;

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(): Promise<ProfileSummary> {
    const record = await this.ensureProfileRecord();
    return this.buildSummary(record.user, record.profile);
  }

  async updateStateIntent(input: UpdateStateIntentRequest): Promise<ProfileSummary> {
    if (!stateOptions.some((option) => option.key === input.stateKey)) {
      throw new BadRequestException("Unknown state key");
    }

    if (!intentOptions.some((option) => option.key === input.intentKey)) {
      throw new BadRequestException("Unknown intent key");
    }

    const record = await this.ensureProfileRecord();
    const updated = await this.prisma.clientInstance.profile.update({
      where: { userId: record.user.id },
      data: {
        stateKey: input.stateKey,
        intentKey: input.intentKey
      }
    });

    return this.buildSummary(record.user, updated);
  }

  async updateTrustKeys(input: UpdateTrustKeysRequest): Promise<ProfileSummary> {
    const sanitized = this.sanitizeTrustKeys(input.trustKeys);

    if (sanitized.length === 0) {
      throw new BadRequestException("At least one trust key is required");
    }

    const record = await this.ensureProfileRecord();
    const updated = await this.prisma.clientInstance.profile.update({
      where: { userId: record.user.id },
      data: {
        trustKeys: sanitized
      }
    });

    return this.buildSummary(record.user, updated);
  }

  async completeOnboarding(input: CompleteOnboardingRequest): Promise<ProfileSummary> {
    const displayName = input.displayName.trim();

    if (displayName.length < 2) {
      throw new BadRequestException("Display name is too short");
    }

    if (!stateOptions.some((option) => option.key === input.stateKey)) {
      throw new BadRequestException("Unknown state key");
    }

    if (!intentOptions.some((option) => option.key === input.intentKey)) {
      throw new BadRequestException("Unknown intent key");
    }

    const trustKeys = this.sanitizeTrustKeys(input.trustKeys);

    if (trustKeys.length === 0) {
      throw new BadRequestException("At least one trust key is required");
    }

    const record = await this.ensureProfileRecord();
    const updated = await this.prisma.clientInstance.profile.update({
      where: { userId: record.user.id },
      data: {
        displayName,
        stateKey: input.stateKey,
        intentKey: input.intentKey,
        trustKeys,
        onboardingCompleted: true
      }
    });

    return this.buildSummary(record.user, updated);
  }

  async getCurrentProfileRecord(): Promise<{ user: User; profile: Profile }> {
    return this.ensureProfileRecord();
  }

  private sanitizeTrustKeys(values: string[]): string[] {
    const allowedTrustKeys = new Set<string>(trustKeyGroups.flatMap((group) => group.items));

    return Array.from(
      new Set(
        values
          .map((item) => item.trim())
          .filter((item) => item.length > 0 && allowedTrustKeys.has(item))
      )
    ).slice(0, 5);
  }

  private async ensureProfileRecord(): Promise<{ user: User; profile: Profile }> {
    const user = await this.prisma.clientInstance.user.upsert({
      where: { telegramUserId: DEMO_TELEGRAM_USER_ID },
      update: {
        telegramUsername: DEMO_TELEGRAM_USERNAME,
        status: "active"
      },
      create: {
        telegramUserId: DEMO_TELEGRAM_USER_ID,
        telegramUsername: DEMO_TELEGRAM_USERNAME,
        status: "active"
      }
    });

    const profile = await this.prisma.clientInstance.profile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        displayName: user.telegramUsername ?? "Новый профиль",
        visibilityStatus: "active",
        matchingEnabled: true,
        stateKey: "calm",
        intentKey: "slow-dialogue",
        trustKeys: [],
        onboardingCompleted: false
      }
    });

    return { user, profile };
  }

  private buildSummary(user: User, profile: Profile): ProfileSummary {
    const visibility = {
      userId: profile.userId,
      isHidden: profile.visibilityStatus === "hidden",
      matchingEnabled: profile.matchingEnabled
    };

    const selectedState =
      stateOptions.find((option) => option.key === profile.stateKey) ?? stateOptions[0];
    const selectedIntent =
      intentOptions.find((option) => option.key === profile.intentKey) ?? intentOptions[0];

    return {
      onboardingCompleted: profile.onboardingCompleted,
      profile: {
        displayName: profile.displayName,
        handle: `@${user.telegramUsername ?? DEMO_TELEGRAM_USERNAME}`
      },
      state: {
        current: selectedState,
        options: stateOptions,
        cooldownLabel: "Изменение станет доступно через 12:00"
      },
      intent: {
        current: selectedIntent,
        options: intentOptions
      },
      trustKeys: {
        selected: profile.trustKeys,
        groups: trustKeyGroups,
        limitLabel: `Выбрано ${profile.trustKeys.length} из 5`,
        cooldownLabel: "Следующее изменение через 13 дней"
      },
      privacy: {
        visibility,
        privacyCopy:
          "Скрытый профиль исключается из новых подборов, но не ломает уже найденную pending-связь.",
        switches: [
          {
            title: "Участвовать в автоматическом matching",
            description: "Когда выключено, новые автоматические связи не создаются.",
            checked: profile.matchingEnabled
          },
          {
            title: "Скрыть профиль из новых подборов",
            description: "Beacon и открытые consent flow остаются под вашим контролем.",
            checked: visibility.isHidden
          }
        ],
        deletionPlan: planDeletion(visibility, privacyRules)
      }
    };
  }
}
