import { Buffer } from "node:buffer";
import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  authenticateUploadSession,
  buildStorageFailureResponse,
  UploadProxyError,
  verifyUploadIntentToken
} from "../../apps/miniapp/src/app/api/media/photo/upload-proxy/logic";

describe("upload proxy security helpers", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.SESSION_SECRET = "session-secret";
    process.env.CORENS_API_BASE_URL = "https://api.example.com";
  });

  afterEach(() => {
    vi.clearAllMocks();
    global.fetch = originalFetch;
  });

  function createIntentToken(userId: string): string {
    const body = Buffer.from(
      JSON.stringify({
        kind: "photo_upload",
        userId,
        objectKey: `user-photo/${userId}/photo.jpg`,
        contentType: "image/jpeg",
        uploadUrl: "https://upload.example.com",
        authorizationToken: "upload-token",
        maxBytes: 5 * 1024 * 1024,
        exp: Math.floor(Date.now() / 1000) + 60
      })
    ).toString("base64url");

    const signature = createHmac("sha256", process.env.SESSION_SECRET!)
      .update(body)
      .digest("base64url");

    return `${body}.${signature}`;
  }

  it("verifies signed upload intents", () => {
    expect(verifyUploadIntentToken(createIntentToken("user-1"))).toEqual(
      expect.objectContaining({
        userId: "user-1",
        objectKey: "user-photo/user-1/photo.jpg"
      })
    );
  });

  it("rejects invalid upload intents", () => {
    expect(() => verifyUploadIntentToken("broken.token")).toThrow(UploadProxyError);
  });

  it("rejects sessions that cannot be authenticated for uploads", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response("nope", { status: 401 })) as typeof fetch;

    await expect(authenticateUploadSession("session-1.secret")).rejects.toMatchObject({
      message: "Mini App session is invalid",
      status: 401
    });
  });

  it("hides raw storage provider errors from clients", async () => {
    const response = buildStorageFailureResponse(503);

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      message: "Не удалось загрузить файл в хранилище. Попробуйте ещё раз."
    });
  });
});
