import { beforeEach, describe, expect, it } from "vitest";
import type {
  BeaconSession,
  ContactConsent,
  DeletionEvent,
  MatchSession,
  ModerationEvent,
  PhotoRevealConsent,
  Profile,
  Session,
  UserPhoto,
  User
} from "@corens/db";
import { AuthService } from "../../apps/api/src/modules/auth/service";
import { ConsentRuntimeService } from "../../apps/api/src/modules/consents/runtime.service";
import type { MediaService } from "../../apps/api/src/modules/media/service";
import { MatchingRuntimeService } from "../../apps/api/src/modules/matching/runtime.service";
import { PrivacyRuntimeService } from "../../apps/api/src/modules/privacy/runtime.service";
import type { ProfilesService } from "../../apps/api/src/modules/profiles";
import type { PrismaService } from "../../apps/api/src/prisma.service";
import { createTelegramInitData } from "../helpers/telegram-init-data";

function createHardDeleteFixture() {
  let userSeq = 3;
  let sessionSeq = 2;
  let deletionSeq = 1;
  const closedNotifications: Array<{ telegramUserId: string; peerName?: string }> = [];

  const users: User[] = [
    {
      id: "user-1",
      telegramUserId: "42",
      telegramUsername: "eugene",
      status: "active",
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      profile: null
    },
    {
      id: "user-2",
      telegramUserId: "84",
      telegramUsername: "peer",
      status: "active",
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      profile: null
    }
  ];
  const userPhotos: UserPhoto[] = [
    {
      userId: "user-1",
      objectKey: "user-photo/user-1/seed.jpg",
      objectVersionId: "file-1",
      mimeType: "image/jpeg",
      sizeBytes: 1024,
      status: "ready",
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  const profiles: Profile[] = [
    {
      userId: "user-1",
      displayName: "Eugene",
      about: null,
      stateKey: "calm",
      intentKey: "slow-dialogue",
      trustKeys: ["tea", "silence"],
      photoCount: 0,
      visibilityStatus: "active",
      matchingEnabled: true,
      onboardingCompleted: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      userId: "user-2",
      displayName: "Peer",
      about: null,
      stateKey: "calm",
      intentKey: "slow-dialogue",
      trustKeys: ["tea"],
      photoCount: 0,
      visibilityStatus: "active",
      matchingEnabled: true,
      onboardingCompleted: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  const sessions: (Session & { user?: User })[] = [
    {
      id: "session-1",
      userId: "user-1",
      tokenHash: "hash",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      revokedAt: null,
      createdAt: new Date(),
      lastSeenAt: new Date()
    }
  ];
  const matchSessions: MatchSession[] = [
    {
      id: "match-1",
      pairKey: "user-1:user-2",
      userAId: "user-1",
      userBId: "user-2",
      origin: "automatic",
      status: "active",
      score: 88,
      createdAt: new Date(),
      expiresAt: null
    }
  ];
  const contactConsents: ContactConsent[] = [
    {
      id: "contact-1",
      matchSessionId: "match-1",
      requestedBy: "user-1",
      requestStatus: "pending",
      resolvedAt: null
    }
  ];
  const photoConsents: PhotoRevealConsent[] = [
    {
      id: "photo-1",
      matchSessionId: "match-1",
      requestedBy: "user-1",
      requestStatus: "pending",
      resolvedAt: null
    }
  ];
  const beaconSessions: BeaconSession[] = [
    {
      id: "beacon-1",
      userId: "user-1",
      status: "active",
      durationMinutes: 60,
      activatedAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      cooldownUntil: null
    }
  ];
  const moderationEvents: ModerationEvent[] = [
    {
      id: "moderation-1",
      matchSessionId: "match-1",
      actorUserId: "user-1",
      targetUserId: "user-2",
      eventType: "report",
      note: "test",
      createdAt: new Date()
    }
  ];
  const deletionEvents: DeletionEvent[] = [];

  const hasMatchWhere = (match: MatchSession, where?: Record<string, unknown>): boolean => {
    if (!where) {
      return true;
    }

    if (typeof where.status === "string" && match.status !== where.status) {
      return false;
    }

    if (
      typeof where.status === "object" &&
      where.status !== null &&
      "in" in where.status &&
      Array.isArray(where.status.in) &&
      !where.status.in.includes(match.status)
    ) {
      return false;
    }

    if (
      typeof where.id === "object" &&
      where.id !== null &&
      "in" in where.id &&
      Array.isArray(where.id.in) &&
      !where.id.in.includes(match.id)
    ) {
      return false;
    }

    if (typeof where.userAId === "string" && match.userAId !== where.userAId) {
      return false;
    }

    if (typeof where.userBId === "string" && match.userBId !== where.userBId) {
      return false;
    }

    if (Array.isArray(where.OR)) {
      return where.OR.some((item) => hasMatchWhere(match, item as Record<string, unknown>));
    }

    return true;
  };

  const prisma = {
    clientInstance: {
      $transaction: async <T>(callback: (tx: typeof prisma.clientInstance) => Promise<T>) =>
        callback(prisma.clientInstance),
      user: {
        findUnique: async ({ where }: { where: { id?: string; telegramUserId?: string } }) =>
          users.find((user) =>
            where.id ? user.id === where.id : user.telegramUserId === where.telegramUserId
          ) ?? null,
        findMany: async ({ where, select }: { where?: { status?: string; profile?: { is?: { onboardingCompleted?: boolean } } }; select?: { id: true } }) => {
          const filtered = users.filter((user) => {
            if (where?.status && user.status !== where.status) {
              return false;
            }

            if (where?.profile?.is?.onboardingCompleted !== undefined) {
              const profile = profiles.find((item) => item.userId === user.id);
              if (!profile || profile.onboardingCompleted !== where.profile.is.onboardingCompleted) {
                return false;
              }
            }

            return true;
          });

          return select?.id ? filtered.map((user) => ({ id: user.id })) : filtered;
        },
        update: async ({ where, data }: { where: { id: string }; data: Partial<User> }) => {
          const user = users.find((item) => item.id === where.id)!;
          Object.assign(user, data);
          return user;
        },
        create: async ({ data }: { data: Pick<User, "telegramUserId" | "telegramUsername" | "status"> }) => {
          const user: User = {
            id: `user-${userSeq++}`,
            firstSeenAt: new Date(),
            lastSeenAt: new Date(),
            profile: null,
            ...data
          };
          users.push(user);
          return user;
        },
        delete: async ({ where }: { where: { id: string } }) => {
          const index = users.findIndex((user) => user.id === where.id);
          return users.splice(index, 1)[0];
        }
      },
      profile: {
        findUnique: async ({
          where,
          include
        }: {
          where: { userId: string };
          include?: { user?: boolean };
        }) => {
          const profile = profiles.find((item) => item.userId === where.userId) ?? null;

          if (!profile || !include?.user) {
            return profile;
          }

          return {
            ...profile,
            user: users.find((user) => user.id === profile.userId) ?? null
          };
        },
        findMany: async ({
          where,
          include
        }: {
          where?: {
            onboardingCompleted?: boolean;
            visibilityStatus?: string;
            userId?: { not?: string };
          };
          include?: { user?: boolean };
        }) => {
          const filtered = profiles.filter((profile) => {
            if (
              where?.onboardingCompleted !== undefined &&
              profile.onboardingCompleted !== where.onboardingCompleted
            ) {
              return false;
            }

            if (where?.visibilityStatus && profile.visibilityStatus !== where.visibilityStatus) {
              return false;
            }

            if (where?.userId?.not && profile.userId === where.userId.not) {
              return false;
            }

            return true;
          });

          if (!include?.user) {
            return filtered;
          }

          return filtered.map((profile) => ({
            ...profile,
            user: users.find((user) => user.id === profile.userId)!
          }));
        },
        create: async ({ data }: { data: Omit<Profile, "createdAt" | "updatedAt" | "photoCount" | "about"> & { about?: string | null; photoCount?: number } }) => {
          const profile: Profile = {
            about: null,
            photoCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data
          };
          profiles.push(profile);
          return profile;
        },
        update: async ({
          where,
          data
        }: {
          where: { userId: string };
          data: Partial<Profile>;
        }) => {
          const profile = profiles.find((item) => item.userId === where.userId)!;
          Object.assign(profile, data, { updatedAt: new Date() });
          return profile;
        },
        deleteMany: async ({ where }: { where: { userId: string } }) => {
          const before = profiles.length;
          for (let index = profiles.length - 1; index >= 0; index -= 1) {
            if (profiles[index].userId === where.userId) {
              profiles.splice(index, 1);
            }
          }
          return { count: before - profiles.length };
        }
      },
      userPhoto: {
        findUnique: async ({ where }: { where: { userId: string } }) =>
          userPhotos.find((photo) => photo.userId === where.userId) ?? null,
        findFirst: async ({
          where
        }: {
          where?: { objectKey?: string; status?: string };
        }) =>
          userPhotos.find((photo) => {
            if (where?.objectKey && photo.objectKey !== where.objectKey) {
              return false;
            }

            if (where?.status && photo.status !== where.status) {
              return false;
            }

            return true;
          }) ?? null,
        delete: async ({ where }: { where: { userId: string } }) => {
          const index = userPhotos.findIndex((photo) => photo.userId === where.userId);
          return userPhotos.splice(index, 1)[0];
        },
        deleteMany: async ({ where }: { where: { userId: string } }) => {
          const before = userPhotos.length;
          for (let index = userPhotos.length - 1; index >= 0; index -= 1) {
            if (userPhotos[index].userId === where.userId) {
              userPhotos.splice(index, 1);
            }
          }
          return { count: before - userPhotos.length };
        }
      },
      session: {
        create: async ({ data }: { data: Pick<Session, "userId" | "tokenHash" | "expiresAt"> }) => {
          const session: Session = {
            id: `session-${sessionSeq++}`,
            createdAt: new Date(),
            lastSeenAt: new Date(),
            revokedAt: null,
            ...data
          };
          sessions.push(session);
          return session;
        },
        deleteMany: async ({ where }: { where: { userId: string } }) => {
          const before = sessions.length;
          for (let index = sessions.length - 1; index >= 0; index -= 1) {
            if (sessions[index].userId === where.userId) {
              sessions.splice(index, 1);
            }
          }
          return { count: before - sessions.length };
        }
      },
      matchSession: {
        findFirst: async ({
          where,
          orderBy
        }: {
          where?: Record<string, unknown>;
          orderBy?: Array<Record<string, "asc" | "desc">> | Record<string, "asc" | "desc">;
        }) => {
          let filtered = matchSessions.filter((match) => hasMatchWhere(match, where));

          if (Array.isArray(orderBy)) {
            filtered = filtered.sort((left, right) => {
              for (const item of orderBy) {
                const [key, direction] = Object.entries(item)[0];
                const leftValue = left[key as keyof MatchSession] ?? "";
                const rightValue = right[key as keyof MatchSession] ?? "";
                if (leftValue === rightValue) {
                  continue;
                }

                return direction === "asc"
                  ? leftValue > rightValue
                    ? 1
                    : -1
                  : leftValue < rightValue
                    ? 1
                    : -1;
              }

              return 0;
            });
          }

          return filtered[0] ?? null;
        },
        findMany: async ({
          where,
          select
        }: {
          where?: Record<string, unknown>;
          select?: { id: true };
        }) => {
          const filtered = matchSessions.filter((match) => hasMatchWhere(match, where));
          return select?.id ? filtered.map((match) => ({ id: match.id })) : filtered;
        },
        update: async ({
          where,
          data
        }: {
          where: { id: string };
          data: Partial<MatchSession>;
        }) => {
          const match = matchSessions.find((item) => item.id === where.id)!;
          Object.assign(match, data);
          return match;
        },
        delete: async ({ where }: { where: { id: string } }) => {
          const index = matchSessions.findIndex((match) => match.id === where.id);
          return matchSessions.splice(index, 1)[0];
        },
        deleteMany: async () => ({ count: 0 })
      },
      contactConsent: {
        findMany: async ({ where }: { where: { matchSessionId: string; requestedBy: { in: string[] } } }) =>
          contactConsents.filter(
            (item) =>
              item.matchSessionId === where.matchSessionId &&
              where.requestedBy.in.includes(item.requestedBy)
          ),
        deleteMany: async ({ where }: { where: { OR: Array<{ matchSessionId?: { in: string[] }; requestedBy?: string }> } }) => {
          const before = contactConsents.length;
          for (let index = contactConsents.length - 1; index >= 0; index -= 1) {
            const item = contactConsents[index];
            const matches = where.OR.some((clause) => {
              if (clause.requestedBy && item.requestedBy === clause.requestedBy) {
                return true;
              }

              if (clause.matchSessionId?.in?.includes(item.matchSessionId)) {
                return true;
              }

              return false;
            });

            if (matches) {
              contactConsents.splice(index, 1);
            }
          }
          return { count: before - contactConsents.length };
        }
      },
      photoRevealConsent: {
        findMany: async ({ where }: { where: { matchSessionId: string; requestedBy: { in: string[] } } }) =>
          photoConsents.filter(
            (item) =>
              item.matchSessionId === where.matchSessionId &&
              where.requestedBy.in.includes(item.requestedBy)
          ),
        deleteMany: async ({ where }: { where: { OR: Array<{ matchSessionId?: { in: string[] }; requestedBy?: string }> } }) => {
          const before = photoConsents.length;
          for (let index = photoConsents.length - 1; index >= 0; index -= 1) {
            const item = photoConsents[index];
            const matches = where.OR.some((clause) => {
              if (clause.requestedBy && item.requestedBy === clause.requestedBy) {
                return true;
              }

              if (clause.matchSessionId?.in?.includes(item.matchSessionId)) {
                return true;
              }

              return false;
            });

            if (matches) {
              photoConsents.splice(index, 1);
            }
          }
          return { count: before - photoConsents.length };
        }
      },
      beaconSession: {
        deleteMany: async ({ where }: { where: { userId?: string } }) => {
          const before = beaconSessions.length;
          for (let index = beaconSessions.length - 1; index >= 0; index -= 1) {
            if (!where.userId || beaconSessions[index].userId === where.userId) {
              beaconSessions.splice(index, 1);
            }
          }
          return { count: before - beaconSessions.length };
        }
      },
      moderationEvent: {
        deleteMany: async ({
          where
        }: {
          where: {
            OR: Array<{
              actorUserId?: string;
              targetUserId?: string;
              matchSessionId?: { in: string[] };
            }>;
          };
        }) => {
          const before = moderationEvents.length;
          for (let index = moderationEvents.length - 1; index >= 0; index -= 1) {
            const item = moderationEvents[index];
            const matches = where.OR.some((clause) => {
              if (clause.actorUserId && item.actorUserId === clause.actorUserId) {
                return true;
              }

              if (clause.targetUserId && item.targetUserId === clause.targetUserId) {
                return true;
              }

              if (clause.matchSessionId?.in?.includes(item.matchSessionId ?? "")) {
                return true;
              }

              return false;
            });

            if (matches) {
              moderationEvents.splice(index, 1);
            }
          }
          return { count: before - moderationEvents.length };
        }
      },
      deletionEvent: {
        deleteMany: async ({ where }: { where: { userId: string } }) => {
          const before = deletionEvents.length;
          for (let index = deletionEvents.length - 1; index >= 0; index -= 1) {
            if (deletionEvents[index].userId === where.userId) {
              deletionEvents.splice(index, 1);
            }
          }
          return { count: before - deletionEvents.length };
        },
        create: async ({ data }: { data: Omit<DeletionEvent, "id" | "requestedAt"> }) => {
          const event: DeletionEvent = {
            id: `deletion-${deletionSeq++}`,
            requestedAt: new Date(),
            ...data
          };
          deletionEvents.push(event);
          return event;
        }
      }
    }
  } as unknown as PrismaService;

  const profilesService = {
    getCurrentProfileRecord: async (user: { id: string }) => {
      const currentUser = users.find((item) => item.id === user.id)!;
      const profile = profiles.find((item) => item.userId === user.id)!;
      return { user: currentUser, profile };
    },
    getSummary: async () => ({
      onboardingCompleted: false,
      profile: {
        displayName: "Новый профиль",
        handle: "@eugene"
      },
      photo: {
        hasPhoto: false,
        statusLabel: "Фото не добавлено"
      },
      state: {
        current: { key: "calm", label: "Спокойствие", description: "..." },
        options: [],
        cooldownLabel: "later"
      },
      intent: {
        current: { key: "slow-dialogue", label: "Медленный диалог", description: "..." },
        options: []
      },
      trustKeys: {
        selected: [],
        groups: [],
        limitLabel: "0",
        cooldownLabel: "later"
      },
      privacy: {
        visibility: {
          userId: "new-user",
          isHidden: false,
          matchingEnabled: true
        },
        privacyCopy: "",
        switches: [],
        deletionPlan: {
          nextVisibility: {
            userId: "new-user",
            isHidden: true,
            matchingEnabled: false
          },
          stages: [],
          sideEffects: []
        }
      }
    })
  } as unknown as ProfilesService;

  const policyConfig = {
    getPrivacyRules: async () => ({
      hiddenProfileClosesPendingConnection: false,
      deletion: {
        revokeSessionsImmediately: true,
        expireBeaconImmediately: true,
        closeOpenConsentsImmediately: true
      }
    }),
    getRetentionPolicies: async () => ({
      retention: {
        match_sessions_days: 30,
        beacon_sessions_days: 30,
        reveal_consents_days: 30
      }
    }),
    getMatchingScoring: async () => ({
      weights: {
        mood: 4,
        intent: 3,
        trustOverlap: 5,
        noConnectionsBonus: 2,
        recentMoodBonus: 1
      },
      freshness: {
        moodHours: 24
      },
      cooldowns: {
        pairRematchHours: 24
      },
      timers: {
        activeMatchHours: 24
      },
      limits: {
        activeConnections: 1
      }
    }),
    getRevealRules: async () => ({
      channels: {
        contact: {
          requiresMutualConsent: true,
          softWarningRequired: true,
          exposedArtifact: "telegram_deep_link"
        },
        photo: {
          requiresMutualConsent: true,
          exposedArtifact: "photo_asset"
        }
      }
    })
  };

  const media = {
    deleteStoredPhotoBytes: async () => undefined
  } as unknown as MediaService;
  const notifications = {
    notifyConnectionClosed: async (telegramUserId: string, peerName?: string) => {
      closedNotifications.push({ telegramUserId, peerName });
    },
    notifyConnectionCreated: async () => undefined,
    notifyContactRequest: async () => undefined,
    notifyPhotoRequest: async () => undefined
  };

  const privacy = new PrivacyRuntimeService(prisma, policyConfig as never, media, notifications as never);
  const consents = new ConsentRuntimeService(prisma, profilesService, policyConfig as never, notifications as never);
  const matching = new MatchingRuntimeService(
    prisma,
    profilesService,
    policyConfig as never,
    consents,
    notifications as never
  );
  const auth = new AuthService(prisma, profilesService, privacy);

  return {
    users,
    profiles,
    sessions,
    matchSessions,
    contactConsents,
    photoConsents,
    beaconSessions,
    moderationEvents,
    deletionEvents,
    userPhotos,
    closedNotifications,
    privacy,
    consents,
    matching,
    auth
  };
}

describe("hard delete flow", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
    process.env.APP_ENV = "test";
    process.env.APP_NAME = "corens-mini-app";
    process.env.API_PORT = "4000";
    process.env.BOT_PORT = "4100";
    process.env.TELEGRAM_BOT_TOKEN = "telegram-bot-token";
    process.env.TELEGRAM_BOT_WEBHOOK_SECRET = "secret";
    process.env.TELEGRAM_BOT_USERNAME = "corens_bot";
    process.env.TELEGRAM_MINI_APP_URL = "https://example.com";
    process.env.DATABASE_URL = "postgres://localhost/corens";
    process.env.DATABASE_URL_UNPOOLED = "postgres://localhost/corens";
    process.env.REDIS_URL = "redis://localhost:6379";
    process.env.SESSION_SECRET = "session-secret";
  });

  it("hard deletes the actor, keeps a peer-deleted summary, and allows re-onboarding", async () => {
    const fixture = createHardDeleteFixture();

    await fixture.privacy.requestDeletion(
      {
        id: "user-1",
        sessionId: "session-1",
        telegramUserId: "42",
        telegramUsername: "eugene"
      },
      "удалить"
    );

    expect(fixture.users.find((user) => user.id === "user-1")).toBeUndefined();
    expect(fixture.profiles.find((profile) => profile.userId === "user-1")).toBeUndefined();
    expect(fixture.sessions.filter((session) => session.userId === "user-1")).toHaveLength(0);
    expect(fixture.userPhotos.filter((photo) => photo.userId === "user-1")).toHaveLength(0);
    expect(fixture.contactConsents).toHaveLength(0);
    expect(fixture.photoConsents).toHaveLength(0);
    expect(fixture.beaconSessions).toHaveLength(0);
    expect(fixture.moderationEvents).toHaveLength(0);
    expect(fixture.deletionEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: "__aggregate__",
          stage: "hard_delete_completed"
        })
      ])
    );
    expect(fixture.matchSessions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "match-1",
          status: "closed_peer_deleted",
          userAId: "user-2",
          userBId: "deleted:match-1"
        })
      ])
    );

    const peerConnections = await fixture.matching.getConnections({
      id: "user-2",
      sessionId: "session-peer",
      telegramUserId: "84",
      telegramUsername: "peer"
    });
    const peerConnection = peerConnections[0];

    expect(peerConnection).toEqual(
      expect.objectContaining({
        kind: "peer_deleted",
        title: "Пользователь больше недоступен"
      })
    );

    const peerConsent = await fixture.consents.getStatus(
      {
        id: "user-2",
        sessionId: "session-peer",
        telegramUserId: "84",
        telegramUsername: "peer"
      },
      "contact"
    );

    expect(peerConsent.status).toBe("declined");
    expect(peerConsent.warnings).toContain("peer_deleted");
    expect(fixture.closedNotifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          telegramUserId: "84"
        })
      ])
    );

    const rawInitData = createTelegramInitData({
      botToken: process.env.TELEGRAM_BOT_TOKEN!,
      user: {
        id: 42,
        username: "eugene"
      }
    });

    const bootstrap = await fixture.auth.bootstrap(rawInitData);

    expect(bootstrap.user.telegramUserId).toBe("42");
    expect(bootstrap.profile.onboardingCompleted).toBe(false);
    expect(fixture.users.filter((user) => user.telegramUserId === "42")).toHaveLength(1);
  });

  it("resets profile data without deleting the user and clears all active sessions", async () => {
    const fixture = createHardDeleteFixture();

    await fixture.privacy.devReset({
      id: "user-1",
      sessionId: "session-1",
      telegramUserId: "42",
      telegramUsername: "eugene"
    });

    expect(fixture.users.find((user) => user.id === "user-1")).toEqual(
      expect.objectContaining({
        id: "user-1",
        telegramUserId: "42",
        status: "active"
      })
    );
    expect(fixture.sessions.filter((session) => session.userId === "user-1")).toHaveLength(0);
    expect(fixture.userPhotos.filter((photo) => photo.userId === "user-1")).toHaveLength(0);
    expect(fixture.beaconSessions).toHaveLength(0);
    expect(fixture.contactConsents).toHaveLength(0);
    expect(fixture.photoConsents).toHaveLength(0);
    expect(fixture.moderationEvents).toHaveLength(0);
    expect(fixture.matchSessions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "match-1",
          status: "closed_manual"
        })
      ])
    );
    expect(fixture.profiles.find((profile) => profile.userId === "user-1")).toEqual(
      expect.objectContaining({
        displayName: "Eugene",
        gender: "",
        about: null,
        stateKey: "calm",
        intentKey: "",
        trustKeys: [],
        visibilityStatus: "active",
        matchingEnabled: true,
        onboardingCompleted: false,
        onboardingStartedAt: null
      })
    );
    expect(fixture.closedNotifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          telegramUserId: "84"
        })
      ])
    );
  });

  it("resets the user by internal userId", async () => {
    const fixture = createHardDeleteFixture();

    await fixture.privacy.resetUserById("user-1");

    expect(fixture.users.find((user) => user.id === "user-1")).toEqual(
      expect.objectContaining({
        id: "user-1",
        status: "active"
      })
    );
    expect(fixture.sessions.filter((session) => session.userId === "user-1")).toHaveLength(0);
    expect(fixture.contactConsents).toHaveLength(0);
    expect(fixture.photoConsents).toHaveLength(0);
    expect(fixture.beaconSessions).toHaveLength(0);
    expect(fixture.matchSessions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "match-1",
          status: "closed_manual"
        })
      ])
    );
    expect(fixture.profiles.find((profile) => profile.userId === "user-1")).toEqual(
      expect.objectContaining({
        displayName: "Eugene",
        onboardingCompleted: false,
        onboardingStartedAt: null
      })
    );
  });
});
