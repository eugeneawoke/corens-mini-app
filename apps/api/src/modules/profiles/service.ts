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
  stateOptions,
  trustKeyGroups
} from "@corens/domain/profile-options";
import type { Profile, User } from "@corens/db";
import { PrismaService } from "../../prisma.service";
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
  constructor(private readonly prisma: PrismaService) {}

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

    if (!intentOptions.some((option) => option.key === input.intentKey)) {
      throw new BadRequestException("Unknown intent key");
    }

    const record = await this.ensureProfileRecord(user);
    const updated = await this.prisma.clientInstance.profile.update({
      where: { userId: record.user.id },
      data: {
        stateKey: input.stateKey,
        intentKey: input.intentKey
      }
    });

    return this.buildSummary(record.user, updated, await this.hasPhoto(record.user.id));
  }

  async updateTrustKeys(
    user: AuthenticatedUserContext,
    input: UpdateTrustKeysRequest
  ): Promise<ProfileSummary> {
    const sanitized = this.sanitizeTrustKeys(input.trustKeys);

    if (sanitized.length === 0) {
      throw new BadRequestException("At least one trust key is required");
    }

    const record = await this.ensureProfileRecord(user);
    const updated = await this.prisma.clientInstance.profile.update({
      where: { userId: record.user.id },
      data: {
        trustKeys: sanitized
      }
    });

    return this.buildSummary(record.user, updated, await this.hasPhoto(record.user.id));
  }

  async completeOnboarding(
    user: AuthenticatedUserContext,
    input: CompleteOnboardingRequest
  ): Promise<ProfileSummary> {
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

    const record = await this.ensureProfileRecord(user);
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

  private async ensureProfileRecord(
    authenticatedUser: AuthenticatedUserContext
  ): Promise<{ user: User; profile: Profile }> {
    const user = await this.prisma.clientInstance.user.findUnique({
      where: { id: authenticatedUser.id }
    });

    if (!user || user.status !== "active") {
      throw new BadRequestException("Active user profile is unavailable");
    }

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

  private async hasPhoto(userId: string): Promise<boolean> {
    const photo = await this.prisma.clientInstance.userPhoto.findUnique({
      where: { userId }
    });

    return Boolean(photo && photo.status === "ready");
  }

  private buildSummary(user: User, profile: Profile, hasPhoto: boolean): ProfileSummary {
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
        handle: user.telegramUsername ? `@${user.telegramUsername}` : `id:${user.telegramUserId}`
      },
      photo: {
        hasPhoto,
        statusLabel: hasPhoto ? "Фото загружено" : "Фото не добавлено"
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
            title: "Скрыть профиль из новых подборов",
            description: "Алгоритм и Beacon продолжают работать только когда профиль видим для новых подборов.",
            checked: visibility.isHidden
          }
        ],
        deletionPlan: planDeletion(visibility, privacyRules)
      }
    };
  }
}
