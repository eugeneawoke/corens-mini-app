import { BadRequestException, Injectable } from "@nestjs/common";
import type {
  CompleteOnboardingRequest,
  ProfileSummary,
  UpdateVisibilityRequest,
  UpdateStateIntentRequest,
  UpdateTrustKeysRequest
} from "@corens/domain";
import {
  hideProfile,
  planDeletion,
  restoreProfile
} from "@corens/domain";
import {
  intentOptions,
  optionalIntentOption,
  stateOptions,
  trustKeyGroups
} from "@corens/domain/profile-options";
import type { Profile, User } from "@corens/db";
import { PrismaService } from "../../prisma.service";
import { PolicyConfigService } from "../../policy-config.service";
import type { AuthenticatedUserContext } from "../auth/service";
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly policyConfig: PolicyConfigService
  ) {}

  async getSummary(user: AuthenticatedUserContext): Promise<ProfileSummary> {
    const record = await this.ensureProfileRecord(user);
    return this.buildSummary(record.user, record.profile, await this.hasPhoto(record.user.id));
  }

  async updateStateIntent(
    user: AuthenticatedUserContext,
    input: UpdateStateIntentRequest
  ): Promise<ProfileSummary> {
    if (!stateOptions.some((option) => option.key === input.stateKey)) {
      throw new BadRequestException("Unknown state key");
    }

    if (input.intentKey.trim().length > 0 && !intentOptions.some((option) => option.key === input.intentKey)) {
      throw new BadRequestException("Unknown intent key");
    }

    const record = await this.ensureProfileRecord(user);
    const updated = await this.prisma.clientInstance.profile.update({
      where: { userId: record.user.id },
      data: {
        stateKey: input.stateKey,
        intentKey: input.intentKey.trim()
      }
    });

    return this.buildSummary(record.user, updated, await this.hasPhoto(record.user.id));
  }

  async updateTrustKeys(
    user: AuthenticatedUserContext,
    input: UpdateTrustKeysRequest
  ): Promise<ProfileSummary> {
    const sanitized = this.sanitizeTrustKeys(input.trustKeys);
    this.assertTrustKeyGroupLimits(sanitized);

    const record = await this.ensureProfileRecord(user);
    const matchingScoring = await this.policyConfig.getMatchingScoring();
    const cooldownMs = matchingScoring.cooldowns.trustKeysDays * 24 * 60 * 60 * 1000;

    if (record.profile.trustKeysUpdatedAt) {
      const elapsed = Date.now() - record.profile.trustKeysUpdatedAt.getTime();
      if (elapsed < cooldownMs) {
        throw new BadRequestException("Ключи доверия можно менять не чаще одного раза в сутки");
      }
    }

    const updated = await this.prisma.clientInstance.profile.update({
      where: { userId: record.user.id },
      data: {
        trustKeys: sanitized,
        trustKeysUpdatedAt: new Date()
      }
    });

    return this.buildSummary(record.user, updated, await this.hasPhoto(record.user.id));
  }

  async completeOnboarding(
    user: AuthenticatedUserContext,
    input: CompleteOnboardingRequest
  ): Promise<ProfileSummary> {
    const displayName = input.displayName.trim().replace(/[<>&"']/g, "");

    if (displayName.length < 2) {
      throw new BadRequestException("Display name is too short");
    }

    if (!stateOptions.some((option) => option.key === input.stateKey)) {
      throw new BadRequestException("Unknown state key");
    }

    if (input.intentKey.trim().length > 0 && !intentOptions.some((option) => option.key === input.intentKey)) {
      throw new BadRequestException("Unknown intent key");
    }

    const trustKeys = this.sanitizeTrustKeys(input.trustKeys);
    this.assertTrustKeyGroupLimits(trustKeys);

    const record = await this.ensureProfileRecord(user);
    const updated = await this.prisma.clientInstance.profile.update({
      where: { userId: record.user.id },
      data: {
        displayName,
        stateKey: input.stateKey,
        intentKey: input.intentKey.trim(),
        trustKeys,
        onboardingCompleted: true
      }
    });

    return this.buildSummary(record.user, updated, await this.hasPhoto(record.user.id));
  }

  async getCurrentProfileRecord(user: AuthenticatedUserContext): Promise<{ user: User; profile: Profile }> {
    return this.ensureProfileRecord(user);
  }

  async updateVisibility(
    user: AuthenticatedUserContext,
    input: UpdateVisibilityRequest
  ): Promise<ProfileSummary> {
    const record = await this.ensureProfileRecord(user);
    const nextVisibility = input.isHidden
      ? hideProfile({
          userId: record.profile.userId,
          isHidden: record.profile.visibilityStatus === "hidden",
          matchingEnabled: record.profile.matchingEnabled
        })
      : restoreProfile({
          userId: record.profile.userId,
          isHidden: record.profile.visibilityStatus === "hidden",
          matchingEnabled: record.profile.matchingEnabled
        });

    const updated = await this.prisma.clientInstance.profile.update({
      where: { userId: record.user.id },
      data: {
        visibilityStatus: nextVisibility.isHidden ? "hidden" : "active",
        matchingEnabled: nextVisibility.matchingEnabled
      }
    });

    return this.buildSummary(record.user, updated, await this.hasPhoto(record.user.id));
  }

  private buildTrustKeysCooldown(
    trustKeysUpdatedAt: Date | null,
    cooldownDays: number
  ): { cooldownLabel: string; isOnCooldown: boolean } {
    if (!trustKeysUpdatedAt) {
      return { cooldownLabel: "Можно изменить в любое время", isOnCooldown: false };
    }

    const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
    const elapsed = Date.now() - trustKeysUpdatedAt.getTime();

    if (elapsed >= cooldownMs) {
      return { cooldownLabel: "Можно изменить в любое время", isOnCooldown: false };
    }

    const remainingMs = cooldownMs - elapsed;
    const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
    const label = remainingHours >= 24
      ? `Следующее изменение через ${Math.ceil(remainingHours / 24)} дн.`
      : `Следующее изменение через ${remainingHours} ч`;

    return { cooldownLabel: label, isOnCooldown: true };
  }

  private sanitizeTrustKeys(values: string[]): string[] {
    const group0Items = new Set<string>(trustKeyGroups[0]?.items ?? []);
    const group1Items = new Set<string>(trustKeyGroups[1]?.items ?? []);
    const allAllowed = new Set<string>([...group0Items, ...group1Items]);

    const unique = Array.from(
      new Set(
        values
          .map((item) => item.trim())
          .filter((item) => item.length > 0 && allAllowed.has(item))
      )
    );

    const group0 = unique.filter((k) => group0Items.has(k)).slice(0, 3);
    const group1 = unique.filter((k) => group1Items.has(k)).slice(0, 2);

    return [...group0, ...group1];
  }

  private assertTrustKeyGroupLimits(keys: string[]): void {
    const group0Items = new Set<string>(trustKeyGroups[0]?.items ?? []);
    const group1Items = new Set<string>(trustKeyGroups[1]?.items ?? []);

    const group0Count = keys.filter((k) => group0Items.has(k)).length;
    const group1Count = keys.filter((k) => group1Items.has(k)).length;

    if (group0Count < 1 || group0Count > 3) {
      throw new BadRequestException(
        `"${trustKeyGroups[0]?.title}" requires 1–3 keys, got ${group0Count}`
      );
    }

    if (group1Count < 1 || group1Count > 2) {
      throw new BadRequestException(
        `"${trustKeyGroups[1]?.title}" requires 1–2 keys, got ${group1Count}`
      );
    }
  }

  private async ensureProfileRecord(
    authenticatedUser: AuthenticatedUserContext
  ): Promise<{ user: User; profile: Profile }> {
    const user = await this.prisma.clientInstance.user.findUnique({
      where: { id: authenticatedUser.id }
    });

    if (!user || user.status !== "active") {
      throw new BadRequestException("Active user profile is unavailable");
    }

    const existing = await this.prisma.clientInstance.profile.findUnique({
      where: { userId: user.id }
    });

    if (existing) {
      return { user, profile: existing };
    }

    const profile = await this.prisma.clientInstance.profile.create({
      data: {
        userId: user.id,
        displayName: user.telegramUsername ?? "Новый профиль",
        visibilityStatus: "active",
        matchingEnabled: true,
        stateKey: "calm",
        intentKey: "",
        trustKeys: [],
        onboardingCompleted: false
      }
    });

    return { user, profile };
  }

  private async hasPhoto(userId: string): Promise<boolean> {
    const photo = await this.prisma.clientInstance.userPhoto.findUnique({
      where: { userId }
    });

    return Boolean(photo && photo.status === "ready");
  }

  private async buildSummary(user: User, profile: Profile, hasPhoto: boolean): Promise<ProfileSummary> {
    const matchingScoring = await this.policyConfig.getMatchingScoring();
    const visibility = {
      userId: profile.userId,
      isHidden: profile.visibilityStatus === "hidden",
      matchingEnabled: profile.matchingEnabled
    };

    const selectedState =
      stateOptions.find((option) => option.key === profile.stateKey) ?? stateOptions[0];
    const selectedIntent =
      intentOptions.find((option) => option.key === profile.intentKey) ?? optionalIntentOption;

    return {
      onboardingCompleted: profile.onboardingCompleted,
      profile: {
        displayName: profile.displayName,
        handle: user.telegramUsername ? `@${user.telegramUsername}` : `id:${user.telegramUserId}`
      },
      photo: {
        hasPhoto,
        statusLabel: hasPhoto ? "Фото загружено" : "Фото не добавлено"
      },
      state: {
        current: selectedState,
        options: stateOptions,
        cooldownLabel: `Настроение влияет на поиск в течение ${matchingScoring.freshness.moodHours} ч после изменения`
      },
      intent: {
        current: selectedIntent,
        options: [optionalIntentOption, ...intentOptions]
      },
      trustKeys: {
        selected: profile.trustKeys,
        groups: trustKeyGroups,
        limitLabel: profile.trustKeys.length >= 5
          ? "Все ключи выбраны"
          : `Выбрано ${profile.trustKeys.length} из 5`,
        ...this.buildTrustKeysCooldown(profile.trustKeysUpdatedAt, matchingScoring.cooldowns.trustKeysDays)
      },
      privacy: {
        visibility,
        privacyCopy:
          "Скрытый профиль исключается из новых подборов, но не ломает уже найденную pending-связь.",
        switches: [
          {
            title: "Скрыть из поиска",
            description: "Когда профиль скрыт, вы не появляетесь в новых подборах. Уже найденная связь при этом не закрывается.",
            checked: visibility.isHidden
          }
        ],
        deletionPlan: planDeletion(visibility, privacyRules)
      }
    };
  }
}
