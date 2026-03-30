import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MatchSession, Profile, User, UserPhoto } from "@corens/db";
import { MediaService } from "../../apps/api/src/modules/media/service";
import type { ConsentRuntimeService } from "../../apps/api/src/modules/consents/runtime.service";
import type { ProfilesService } from "../../apps/api/src/modules/profiles";
import type { PrismaService } from "../../apps/api/src/prisma.service";

function createMediaFixture() {
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
  const profiles: Profile[] = [
    {
      userId: "user-1",
      displayName: "Eugene",
      about: null,
      stateKey: "calm",
      intentKey: "slow-dialogue",
      trustKeys: [],
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
      trustKeys: [],
      photoCount: 0,
      visibilityStatus: "active",
      matchingEnabled: true,
      onboardingCompleted: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  const photos: UserPhoto[] = [];
  const matches: MatchSession[] = [
    {
      id: "match-1",
      pairKey: "user-1:user-2",
      userAId: "user-1",
      userBId: "user-2",
      origin: "automatic",
      status: "active",
      score: 90,
      createdAt: new Date(),
      expiresAt: null
    }
  ];

  const prisma = {
    clientInstance: {
      userPhoto: {
        findUnique: async ({ where }: { where: { userId: string } }) =>
          photos.find((photo) => photo.userId === where.userId) ?? null,
        findFirst: async ({
          where
        }: {
          where?: { userId?: string; objectKey?: string; status?: string };
        }) =>
          photos.find((photo) => {
            if (where?.userId && photo.userId !== where.userId) {
              return false;
            }

            if (where?.objectKey && photo.objectKey !== where.objectKey) {
              return false;
            }

            if (where?.status && photo.status !== where.status) {
              return false;
            }

            return true;
          }) ?? null,
        upsert: async ({
          where,
          update,
          create
        }: {
          where: { userId: string };
          update: Partial<UserPhoto>;
          create: UserPhoto;
        }) => {
          const existing = photos.find((photo) => photo.userId === where.userId);
          if (existing) {
            Object.assign(existing, update, { updatedAt: new Date() });
            return existing;
          }

          photos.push(create);
          return create;
        },
        delete: async ({ where }: { where: { userId: string } }) => {
          const index = photos.findIndex((photo) => photo.userId === where.userId);
          return photos.splice(index, 1)[0];
        }
      },
      matchSession: {
        findFirst: async ({ where }: { where?: { status?: string; OR?: Array<{ userAId?: string; userBId?: string }> } }) =>
          matches.find((match) => {
            if (where?.status && match.status !== where.status) {
              return false;
            }

            if (where?.OR) {
              return where.OR.some(
                (condition) =>
                  (condition.userAId && match.userAId === condition.userAId) ||
                  (condition.userBId && match.userBId === condition.userBId)
              );
            }

            return true;
          }) ?? null
      }
    }
  } as unknown as PrismaService;

  const profilesService = {
    getCurrentProfileRecord: async (user: { id: string }) => ({
      user: users.find((item) => item.id === user.id)!,
      profile: profiles.find((item) => item.userId === user.id)!
    })
  } as unknown as ProfilesService;

  let consentStatus: "pending" | "approved" = "pending";
  const consents = {
    getStatus: async () => ({
      channel: "photo" as const,
      status: consentStatus,
      warnings: []
    })
  } as unknown as ConsentRuntimeService;

  return {
    photos,
    media: new MediaService(prisma, profilesService, consents),
    setConsentApproved() {
      consentStatus = "approved";
    }
  };
}

describe("MediaService", () => {
  const originalFetch = global.fetch;

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
    process.env.B2_KEY_ID = "key";
    process.env.B2_APPLICATION_KEY = "secret";
    process.env.B2_BUCKET_ID = "bucket-id";
    process.env.B2_BUCKET_NAME = "bucket-name";
    process.env.B2_ENDPOINT = "https://b2.example.com";
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("creates upload intents and confirms photo metadata", async () => {
    const fixture = createMediaFixture();
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            apiUrl: "https://api.b2.example.com",
            authorizationToken: "account-token",
            downloadUrl: "https://download.b2.example.com"
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            uploadUrl: "https://upload.b2.example.com",
            authorizationToken: "upload-token"
          }),
          { status: 200 }
        )
      ) as typeof fetch;

    const intent = await fixture.media.createUploadIntent(
      {
        id: "user-1",
        sessionId: "session-1",
        telegramUserId: "42",
        telegramUsername: "eugene"
      },
      {
        contentType: "image/jpeg"
      }
    );

    expect(intent).not.toHaveProperty("uploadUrl");
    expect(intent).not.toHaveProperty("authorizationToken");
    expect(intent).not.toHaveProperty("objectKey");
    expect(intent.allowedMimeTypes).toContain("image/jpeg");

    const summary = await fixture.media.confirmUpload(
      {
        id: "user-1",
        sessionId: "session-1",
        telegramUserId: "42",
        telegramUsername: "eugene"
      },
      {
        intentToken: intent.intentToken,
        fileId: "file-1",
        contentType: "image/jpeg",
        sizeBytes: 1024
      }
    );

    expect(summary.hasPhoto).toBe(true);
    expect(fixture.photos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: "user-1",
          objectVersionId: "file-1",
          status: "ready"
        })
      ])
    );
  });

  it("returns photo_missing until the peer has a photo, then returns ready", async () => {
    const fixture = createMediaFixture();
    fixture.setConsentApproved();

    const missing = await fixture.media.getPhotoRevealSummary(
      {
        id: "user-1",
        sessionId: "session-1",
        telegramUserId: "42",
        telegramUsername: "eugene"
      },
      "match-1"
    );

    expect(missing.state).toBe("photo_missing");

    fixture.photos.push({
      userId: "user-2",
      objectKey: "user-photo/user-2/photo.jpg",
      objectVersionId: "file-2",
      mimeType: "image/jpeg",
      sizeBytes: 2048,
      status: "ready",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const ready = await fixture.media.getPhotoRevealSummary(
      {
        id: "user-1",
        sessionId: "session-1",
        telegramUserId: "42",
        telegramUsername: "eugene"
      },
      "match-1"
    );

    expect(ready.state).toBe("ready");
    expect(ready.imageUrl).toContain("/api/media/photo/access?token=");
  });

  it("fails when storage byte deletion fails", async () => {
    const fixture = createMediaFixture();
    fixture.photos.push({
      userId: "user-1",
      objectKey: "user-photo/user-1/photo.jpg",
      objectVersionId: "file-1",
      mimeType: "image/jpeg",
      sizeBytes: 1024,
      status: "ready",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            apiUrl: "https://api.b2.example.com",
            authorizationToken: "account-token",
            downloadUrl: "https://download.b2.example.com"
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "boom" }), { status: 503 })
      ) as typeof fetch;

    await expect(
      fixture.media.deletePhoto({
        id: "user-1",
        sessionId: "session-1",
        telegramUserId: "42",
        telegramUsername: "eugene"
      })
    ).rejects.toThrow("Photo storage delete failed");
  });
});
