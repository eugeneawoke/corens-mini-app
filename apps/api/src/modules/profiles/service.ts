import { BadRequestException, Injectable } from "@nestjs/common";
import type { ProfileSummary, UpdateStateIntentRequest, UpdateTrustKeysRequest } from "@corens/domain";
import {
  createDemoMvpState,
  createProfileSummary,
  intentOptions,
  stateOptions,
  trustKeyGroups,
  type DemoMvpState
} from "@corens/domain";
import type { Profile, User } from "@corens/db";
import { PrismaService } from "../../prisma.service";

const DEMO_TELEGRAM_USER_ID = "demo-telegram-user";
const DEMO_TELEGRAM_USERNAME = "maria_user";

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
    const allowedTrustKeys = new Set<string>(trustKeyGroups.flatMap((group) => group.items));
    const sanitized = Array.from(
      new Set(
        input.trustKeys
          .map((item) => item.trim())
          .filter((item) => item.length > 0 && allowedTrustKeys.has(item))
      )
    ).slice(0, 5);

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
        displayName: "Мария",
        visibilityStatus: "active",
        matchingEnabled: true,
        stateKey: "calm",
        intentKey: "slow-dialogue",
        trustKeys: ["Тишина", "Честность", "Бережность"]
      }
    });

    return { user, profile };
  }

  private buildSummary(user: User, profile: Profile): ProfileSummary {
    const state: DemoMvpState = createDemoMvpState();

    state.profile.displayName = profile.displayName;
    state.profile.handle = `@${user.telegramUsername ?? DEMO_TELEGRAM_USERNAME}`;
    state.profile.stateKey = profile.stateKey;
    state.profile.intentKey = profile.intentKey;
    state.profile.trustKeys = profile.trustKeys;
    state.profile.visibility = {
      userId: profile.userId,
      isHidden: profile.visibilityStatus === "hidden",
      matchingEnabled: profile.matchingEnabled
    };

    return createProfileSummary(state);
  }
}
