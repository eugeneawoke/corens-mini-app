import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import type { Profile, User } from "@corens/db";
import { ProfilesService } from "../../apps/api/src/modules/profiles";
import type { PolicyConfigService } from "../../apps/api/src/policy-config.service";
import type { PrismaService } from "../../apps/api/src/prisma.service";
import rules from "../../config/moderation/profile-content.v1.json";

function createFixture() {
  const user: User = {
    id: "user-1",
    telegramUserId: "42",
    telegramUsername: "anna",
    status: "active",
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
    profile: null
  };
  const profile: Profile = {
    userId: user.id,
    displayName: "Анна",
    about: null,
    stateKey: "calm",
    intentKey: "",
    trustKeys: ["Тихий разговор", "Тёплая поддержка"],
    photoCount: 0,
    visibilityStatus: "active",
    matchingEnabled: true,
    onboardingCompleted: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  let profileWrites = 0;

  const prisma = {
    clientInstance: {
      user: { findUnique: async () => user },
      profile: {
        findUnique: async () => profile,
        create: async () => {
          profileWrites += 1;
          return profile;
        },
        update: async ({ data }: { data: Partial<Profile> }) => {
          profileWrites += 1;
          Object.assign(profile, data);
          return profile;
        }
      },
      userPhoto: { findUnique: async () => null }
    }
  } as unknown as PrismaService;
  const policyConfig = {
    getMatchingScoring: async () => ({ freshness: { moodHours: 24 } }),
    getProfileContentRules: async () => rules
  } as unknown as PolicyConfigService;

  return {
    profile,
    getProfileWrites: () => profileWrites,
    service: new ProfilesService(prisma, policyConfig)
  };
}

const user = { id: "user-1", telegramUserId: "42" };
const expectedMessages = {
  abusive: "Уберите грубые или оскорбительные выражения",
  contact: "Не добавляйте ссылки и контактные данные",
  advertising: "Описание профиля нельзя использовать для рекламы"
} as const;

describe("profile content enforcement", () => {
  it.each([
    ["abusive", "ты дурак"],
    ["contact", "t.me/example"],
    ["advertising", "купите сейчас"]
  ] as const)("rejects %s bios before a profile write", async (category, about) => {
    const fixture = createFixture();

    await expect(fixture.service.updateAbout(user, { about })).rejects.toMatchObject({
      response: {
        statusCode: 400,
        code: "profile_content_rejected",
        category,
        message: expectedMessages[category]
      }
    });
    expect(fixture.getProfileWrites()).toBe(0);
  });

  it("rejects a prohibited onboarding name before looking up or writing a profile", async () => {
    const fixture = createFixture();

    await expect(
      fixture.service.completeOnboarding(user, {
        displayName: "ты дурак",
        gender: "female",
        stateKey: "calm",
        intentKey: "",
        trustKeys: ["Тихий разговор", "Тёплая поддержка"]
      })
    ).rejects.toMatchObject({
      response: {
        statusCode: 400,
        code: "profile_content_rejected",
        category: "abusive",
        message: expectedMessages.abusive
      }
    });
    expect(fixture.getProfileWrites()).toBe(0);
  });

  it("persists safe bio input", async () => {
    const fixture = createFixture();

    await fixture.service.updateAbout(user, { about: "Люблю тихие прогулки и внимательные разговоры" });

    expect(fixture.profile.about).toBe("Люблю тихие прогулки и внимательные разговоры");
    expect(fixture.getProfileWrites()).toBe(1);
  });
});
