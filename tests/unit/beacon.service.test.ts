import { beforeEach, describe, expect, it } from "vitest";
import type { BeaconSession, Profile, User } from "@corens/db";
import { BeaconService } from "../../apps/api/src/modules/beacon/service";
import type { ProfilesService } from "../../apps/api/src/modules/profiles";
import type { PrismaService } from "../../apps/api/src/prisma.service";

function createBeaconFixture() {
  const now = Date.now();
  const users: User[] = [
    {
      id: "user-1",
      telegramUserId: "42",
      telegramUsername: "eugene",
      status: "active",
      firstSeenAt: new Date(now),
      lastSeenAt: new Date(now),
      profile: null
    }
  ];
  const profiles: Profile[] = [
    {
      userId: "user-1",
      displayName: "Eugene",
      gender: "male",
      partnerGender: "opposite",
      about: null,
      stateKey: "calm",
      intentKey: "",
      trustKeys: [],
      trustKeysUpdatedAt: null,
      photoCount: 0,
      visibilityStatus: "active",
      matchingEnabled: true,
      onboardingCompleted: true,
      onboardingStartedAt: new Date(now),
      createdAt: new Date(now),
      updatedAt: new Date(now)
    }
  ];
  const beaconSessions: BeaconSession[] = [
    {
      id: "beacon-1",
      userId: "user-1",
      status: "expired",
      durationMinutes: 15,
      activatedAt: new Date(now - 5 * 60_000),
      expiresAt: new Date(now - 4 * 60_000),
      cooldownUntil: new Date(now + 10 * 60_000)
    }
  ];

  const prisma = {
    clientInstance: {
      beaconSession: {
        findFirst: async ({
          where,
          orderBy
        }: {
          where: {
            userId: string;
            status?: string;
            expiresAt?: { gt?: Date; lte?: Date };
            cooldownUntil?: { gt?: Date };
          };
          orderBy?: { expiresAt?: "desc"; cooldownUntil?: "desc" };
        }) => {
          let filtered = beaconSessions.filter((session) => {
            if (session.userId !== where.userId) return false;
            if (where.status && session.status !== where.status) return false;
            if (where.expiresAt?.gt && !(session.expiresAt > where.expiresAt.gt)) return false;
            if (where.expiresAt?.lte && !(session.expiresAt <= where.expiresAt.lte)) return false;
            if (where.cooldownUntil?.gt && !(session.cooldownUntil && session.cooldownUntil > where.cooldownUntil.gt)) return false;
            return true;
          });

          if (orderBy?.expiresAt === "desc") {
            filtered = filtered.sort((a, b) => b.expiresAt.getTime() - a.expiresAt.getTime());
          }

          if (orderBy?.cooldownUntil === "desc") {
            filtered = filtered.sort(
              (a, b) => (b.cooldownUntil?.getTime() ?? 0) - (a.cooldownUntil?.getTime() ?? 0)
            );
          }

          return filtered[0] ?? null;
        },
        count: async ({ where }: { where: { userId: string; activatedAt: { gte: Date } } }) =>
          beaconSessions.filter(
            (session) => session.userId === where.userId && session.activatedAt >= where.activatedAt.gte
          ).length,
        updateMany: async ({
          where,
          data
        }: {
          where: { userId?: string; status?: string; expiresAt?: { lte: Date } };
          data: Partial<BeaconSession>;
        }) => {
          const matched = beaconSessions.filter((session) => {
            if (where.userId && session.userId !== where.userId) return false;
            if (where.status && session.status !== where.status) return false;
            if (where.expiresAt?.lte && !(session.expiresAt <= where.expiresAt.lte)) return false;
            return true;
          });

          matched.forEach((session) => Object.assign(session, data));
          return { count: matched.length };
        },
        create: async ({ data }: { data: Omit<BeaconSession, "id" | "activatedAt"> }) => {
          const session: BeaconSession = {
            id: `beacon-${beaconSessions.length + 1}`,
            activatedAt: new Date(),
            ...data
          };
          beaconSessions.push(session);
          return session;
        }
      }
    }
  } as unknown as PrismaService;

  const profilesService = {
    getCurrentProfileRecord: async ({ id }: { id: string }) => ({
      user: users.find((user) => user.id === id)!,
      profile: profiles.find((profile) => profile.userId === id)!
    })
  } as unknown as ProfilesService;

  const policyConfig = {
    getBeaconRules: async () => ({
      version: "v1",
      intervalsMinutes: [15, 30, 45, 60],
      cooldownMinutes: 15,
      activationsPerDay: 4
    })
  };

  return {
    beacon: new BeaconService(prisma, profilesService, policyConfig as never),
    beaconSessions
  };
}

describe("BeaconService", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
  });

  it("blocks activation while cooldown is still active", async () => {
    const fixture = createBeaconFixture();

    const result = await fixture.beacon.activate(
      {
        id: "user-1",
        sessionId: "session-1",
        telegramUserId: "42",
        telegramUsername: "eugene"
      },
      15
    );

    expect(result.status).toBe("cooldown");
    expect(result.cooldownUntil).toBeTruthy();
    expect(fixture.beaconSessions).toHaveLength(1);
    expect(fixture.beaconSessions[0]?.status).toBe("expired");
  });

  it("starts cooldown from the manual deactivation moment", async () => {
    const fixture = createBeaconFixture();
    fixture.beaconSessions[0] = {
      ...fixture.beaconSessions[0]!,
      status: "active",
      expiresAt: new Date(Date.now() + 15 * 60_000),
      cooldownUntil: new Date(Date.now() + 30 * 60_000)
    };

    const before = Date.now();
    await fixture.beacon.deactivate({
      id: "user-1",
      sessionId: "session-1",
      telegramUserId: "42",
      telegramUsername: "eugene"
    });
    const after = Date.now();

    expect(fixture.beaconSessions[0]?.status).toBe("expired");
    expect(fixture.beaconSessions[0]?.expiresAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(fixture.beaconSessions[0]?.expiresAt.getTime()).toBeLessThanOrEqual(after);
    expect(fixture.beaconSessions[0]?.cooldownUntil?.getTime()).toBeGreaterThanOrEqual(
      before + 15 * 60_000
    );
    expect(fixture.beaconSessions[0]?.cooldownUntil?.getTime()).toBeLessThanOrEqual(
      after + 15 * 60_000
    );
  });
});
