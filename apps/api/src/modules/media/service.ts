import { createHmac, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException
} from "@nestjs/common";
import { readAppEnv } from "@corens/config";
import type {
  ConfirmPhotoUploadRequest,
  CreatePhotoUploadIntentRequest,
  PhotoRevealSummary,
  PhotoSummary,
  PhotoUploadIntent
} from "@corens/domain";
import type { UserPhoto } from "@corens/db";
import { PrismaService } from "../../prisma.service";
import type { AuthenticatedUserContext } from "../auth/service";
import { ConsentRuntimeService } from "../consents/runtime.service";
import { ProfilesService } from "../profiles";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const UPLOAD_INTENT_TTL_SECONDS = 10 * 60;
const ACCESS_TOKEN_TTL_SECONDS = 5 * 60;

type PhotoUploadIntentPayload = {
  kind: "photo_upload";
  userId: string;
  objectKey: string;
  contentType: string;
  uploadUrl: string;
  authorizationToken: string;
  maxBytes: number;
  exp: number;
};

type PhotoAccessTokenPayload = {
  kind: "photo_preview" | "photo_reveal";
  viewerUserId: string;
  ownerUserId: string;
  objectKey: string;
  matchSessionId?: string;
  exp: number;
};

type B2AuthorizeResponse = {
  apiUrl: string;
  authorizationToken: string;
  downloadUrl: string;
};

type B2UploadUrlResponse = {
  uploadUrl: string;
  authorizationToken: string;
};

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesService,
    private readonly consents: ConsentRuntimeService
  ) {}

  async getPhotoSummary(user: AuthenticatedUserContext): Promise<PhotoSummary> {
    await this.profiles.getCurrentProfileRecord(user);
    const photo = await this.prisma.clientInstance.userPhoto.findUnique({
      where: { userId: user.id }
    });

    if (!photo || photo.status !== "ready") {
      return {
        hasPhoto: false,
        status: "missing",
        statusCopy: "Фото ещё не загружено."
      };
    }

    return {
      hasPhoto: true,
      status: "ready",
      statusCopy: "Фото загружено и будет раскрыто только после взаимного согласия.",
      previewUrl: this.buildAccessUrl({
        kind: "photo_preview",
        viewerUserId: user.id,
        ownerUserId: user.id,
        objectKey: photo.objectKey
      })
    };
  }

  async createUploadIntent(
    user: AuthenticatedUserContext,
    input: CreatePhotoUploadIntentRequest
  ): Promise<PhotoUploadIntent> {
    await this.profiles.getCurrentProfileRecord(user);
    const contentType = input.contentType.trim().toLowerCase();

    if (!ALLOWED_MIME_TYPES.includes(contentType as (typeof ALLOWED_MIME_TYPES)[number])) {
      throw new BadRequestException("Unsupported photo content type");
    }

    const storage = this.requireStorageConfig();
    const authorization = await this.authorizeAccount(storage);
    const uploadTarget = await this.getUploadUrl(storage, authorization);
    const extension = this.extensionForContentType(contentType);
    const objectKey = `user-photo/${user.id}/${Date.now()}.${extension}`;

    return {
      intentToken: this.signPayload({
        kind: "photo_upload",
        userId: user.id,
        objectKey,
        contentType,
        uploadUrl: uploadTarget.uploadUrl,
        authorizationToken: uploadTarget.authorizationToken,
        maxBytes: MAX_PHOTO_BYTES,
        exp: this.expiresAt(UPLOAD_INTENT_TTL_SECONDS)
      }),
      expiresAt: new Date(Date.now() + UPLOAD_INTENT_TTL_SECONDS * 1000).toISOString(),
      maxBytes: MAX_PHOTO_BYTES,
      allowedMimeTypes: [...ALLOWED_MIME_TYPES]
    };
  }

  async confirmUpload(
    user: AuthenticatedUserContext,
    input: ConfirmPhotoUploadRequest
  ): Promise<PhotoSummary> {
    await this.profiles.getCurrentProfileRecord(user);

    const payload = this.verifyUploadIntent(input.intentToken);
    if (payload.kind !== "photo_upload" || payload.userId !== user.id) {
      throw new ForbiddenException("Photo upload intent is invalid");
    }

    if (payload.contentType !== input.contentType) {
      throw new BadRequestException("Photo upload content type mismatch");
    }

    if (input.sizeBytes <= 0 || input.sizeBytes > MAX_PHOTO_BYTES) {
      throw new BadRequestException("Photo upload exceeds maximum size");
    }

    const existing = await this.prisma.clientInstance.userPhoto.findUnique({
      where: { userId: user.id }
    });

    await this.prisma.clientInstance.userPhoto.upsert({
      where: { userId: user.id },
      update: {
        objectKey: payload.objectKey,
        objectVersionId: input.fileId,
        mimeType: input.contentType,
        sizeBytes: input.sizeBytes,
        status: "ready"
      },
      create: {
        userId: user.id,
        objectKey: payload.objectKey,
        objectVersionId: input.fileId,
        mimeType: input.contentType,
        sizeBytes: input.sizeBytes,
        status: "ready"
      }
    });

    if (existing) {
      await this.deleteStoredPhotoBytes(existing);
    }

    return this.getPhotoSummary(user);
  }

  async deletePhoto(user: AuthenticatedUserContext): Promise<void> {
    await this.profiles.getCurrentProfileRecord(user);
    const existing = await this.prisma.clientInstance.userPhoto.findUnique({
      where: { userId: user.id }
    });

    if (!existing) {
      return;
    }

    await this.prisma.clientInstance.userPhoto.delete({
      where: { userId: user.id }
    });
    await this.deleteStoredPhotoBytes(existing);
  }

  async getPhotoRevealSummary(user: AuthenticatedUserContext, connectionId: string): Promise<PhotoRevealSummary> {
    const record = await this.profiles.getCurrentProfileRecord(user);
    const consent = await this.consents.getStatus(user, "photo", connectionId);

    if (consent.status !== "approved") {
      return {
        state: "locked",
        title: "Фото пока закрыто",
        description: "Фото откроется только после взаимного согласия."
      };
    }

    const match = await this.prisma.clientInstance.matchSession.findFirst({
      where: {
        id: connectionId,
        OR: [{ userAId: record.user.id }, { userBId: record.user.id }]
      }
    });

    if (!match) {
      return {
        state: "locked",
        title: "Фото пока закрыто",
        description: "Сначала нужна активная связь."
      };
    }

    const peerUserId = match.userAId === record.user.id ? match.userBId : match.userAId;
    const peerPhoto = await this.prisma.clientInstance.userPhoto.findUnique({
      where: { userId: peerUserId }
    });

    if (!peerPhoto || peerPhoto.status !== "ready") {
      return {
        state: "photo_missing",
        title: "Фото пока не добавлено",
        description: "У другого человека ещё нет загруженного фото."
      };
    }

      return {
        state: "ready",
        title: "Фото открыто",
        description: "Фото доступно, пока действует эта связь и взаимное согласие.",
        imageUrl: this.buildAccessUrl({
          kind: "photo_reveal",
          viewerUserId: user.id,
          ownerUserId: peerUserId,
          objectKey: peerPhoto.objectKey,
          matchSessionId: match.id
        })
      };
  }

  async streamPhoto(user: AuthenticatedUserContext, accessToken: string): Promise<{
    buffer: Buffer;
    contentType: string;
  }> {
    const payload = this.verifyPhotoAccessToken(accessToken);

    if (payload.viewerUserId !== user.id) {
      throw new ForbiddenException("Photo access token is invalid");
    }

    if (payload.kind === "photo_reveal") {
      if (!payload.matchSessionId) {
        throw new ForbiddenException("Photo access token is invalid");
      }

      const consent = await this.consents.getStatus(user, "photo", payload.matchSessionId);

      if (consent.status !== "approved") {
        throw new ForbiddenException("Photo access is unavailable");
      }
    } else if (payload.ownerUserId !== user.id) {
      throw new ForbiddenException("Photo access token is invalid");
    }

    const photo = await this.prisma.clientInstance.userPhoto.findFirst({
      where: {
        userId: payload.ownerUserId,
        objectKey: payload.objectKey,
        status: "ready"
      }
    });

    if (!photo) {
      throw new NotFoundException("Photo is unavailable");
    }

    const response = await this.downloadPhotoBytes(photo.objectKey);
    return {
      buffer: response,
      contentType: photo.mimeType
    };
  }

  async deleteUserPhotoByUserId(userId: string): Promise<void> {
    const photo = await this.prisma.clientInstance.userPhoto.findUnique({
      where: { userId }
    });

    if (!photo) {
      return;
    }

    await this.prisma.clientInstance.userPhoto.delete({
      where: { userId }
    });
    await this.deleteStoredPhotoBytes(photo);
  }

  private buildAccessUrl(payload: Omit<PhotoAccessTokenPayload, "exp">): string {
    const env = readAppEnv();
    const urlBase = env.TELEGRAM_MINI_APP_URL.replace(/\/$/, "");
    const token = this.signPayload({
      ...payload,
      exp: this.expiresAt(ACCESS_TOKEN_TTL_SECONDS)
    });

    return `${urlBase}/api/media/photo/access?token=${encodeURIComponent(token)}`;
  }

  private signPayload(payload: Record<string, string | number | undefined>): string {
    const env = readAppEnv();
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = createHmac("sha256", env.SESSION_SECRET).update(body).digest("base64url");
    return `${body}.${signature}`;
  }

  private verifyPayload(token: string): Record<string, string | number> {
    const env = readAppEnv();
    const [body, signature] = token.split(".", 2);

    if (!body || !signature) {
      throw new ForbiddenException("Signed payload is invalid");
    }

    const expected = createHmac("sha256", env.SESSION_SECRET).update(body).digest("base64url");

    if (
      expected.length !== signature.length ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    ) {
      throw new ForbiddenException("Signed payload is invalid");
    }

    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Record<string, string | number>;

    if (Number(payload.exp) <= Math.floor(Date.now() / 1000)) {
      throw new ForbiddenException("Signed payload has expired");
    }

    return payload;
  }

  private verifyUploadIntent(token: string): PhotoUploadIntentPayload {
    const payload = this.verifyPayload(token);

    if (
      payload.kind !== "photo_upload" ||
      typeof payload.userId !== "string" ||
      typeof payload.objectKey !== "string" ||
      typeof payload.contentType !== "string" ||
      typeof payload.uploadUrl !== "string" ||
      typeof payload.authorizationToken !== "string" ||
      typeof payload.maxBytes !== "number"
    ) {
      throw new ForbiddenException("Photo upload intent is invalid");
    }

    return payload as unknown as PhotoUploadIntentPayload;
  }

  private verifyPhotoAccessToken(token: string): PhotoAccessTokenPayload {
    const payload = this.verifyPayload(token);

    if (
      (payload.kind !== "photo_preview" && payload.kind !== "photo_reveal") ||
      typeof payload.viewerUserId !== "string" ||
      typeof payload.ownerUserId !== "string" ||
      typeof payload.objectKey !== "string"
    ) {
      throw new ForbiddenException("Photo access token is invalid");
    }

    if (payload.kind === "photo_reveal" && typeof payload.matchSessionId !== "string") {
      throw new ForbiddenException("Photo access token is invalid");
    }

    return payload as unknown as PhotoAccessTokenPayload;
  }

  private expiresAt(ttlSeconds: number): number {
    return Math.floor(Date.now() / 1000) + ttlSeconds;
  }

  private requireStorageConfig() {
    const env = readAppEnv();

    if (!env.B2_KEY_ID || !env.B2_APPLICATION_KEY || !env.B2_BUCKET_ID || !env.B2_BUCKET_NAME) {
      throw new ServiceUnavailableException("Photo storage is not configured");
    }

    return env;
  }

  private async authorizeAccount(env: ReturnType<typeof readAppEnv>): Promise<B2AuthorizeResponse> {
    const endpoint = env.B2_ENDPOINT || "https://api.backblazeb2.com";
    const credentials = Buffer.from(`${env.B2_KEY_ID}:${env.B2_APPLICATION_KEY}`).toString("base64");
    const response = await fetch(`${endpoint}/b2api/v2/b2_authorize_account`, {
      headers: {
        authorization: `Basic ${credentials}`
      }
    });

    if (!response.ok) {
      throw new ServiceUnavailableException("Photo storage authorization failed");
    }

    return (await response.json()) as B2AuthorizeResponse;
  }

  private async getUploadUrl(
    env: ReturnType<typeof readAppEnv>,
    authorization: B2AuthorizeResponse
  ): Promise<B2UploadUrlResponse> {
    const response = await fetch(`${authorization.apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: "POST",
      headers: {
        authorization: authorization.authorizationToken,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        bucketId: env.B2_BUCKET_ID
      })
    });

    if (!response.ok) {
      throw new ServiceUnavailableException("Photo storage upload intent failed");
    }

    return (await response.json()) as B2UploadUrlResponse;
  }

  private async downloadPhotoBytes(objectKey: string): Promise<Buffer> {
    const env = this.requireStorageConfig();
    const authorization = await this.authorizeAccount(env);
    const encodedKey = objectKey.split("/").map((segment) => encodeURIComponent(segment)).join("/");
    const response = await fetch(
      `${authorization.downloadUrl}/file/${encodeURIComponent(env.B2_BUCKET_NAME)}/${encodedKey}`,
      {
        headers: {
          authorization: authorization.authorizationToken
        }
      }
    );

    if (!response.ok) {
      throw new NotFoundException("Photo is unavailable");
    }

    return Buffer.from(await response.arrayBuffer());
  }

  async deleteStoredPhotoBytes(
    photo: Pick<UserPhoto, "objectKey" | "objectVersionId">
  ): Promise<void> {
    try {
      const env = this.requireStorageConfig();
      const authorization = await this.authorizeAccount(env);
      const response = await fetch(`${authorization.apiUrl}/b2api/v2/b2_delete_file_version`, {
        method: "POST",
        headers: {
          authorization: authorization.authorizationToken,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          fileName: photo.objectKey,
          fileId: photo.objectVersionId
        })
      });

      if (!response.ok) {
        throw new ServiceUnavailableException("Photo storage delete failed");
      }
    } catch (error) {
      this.logger.warn("Photo byte deletion failed before metadata cleanup");
      throw error instanceof Error
        ? error
        : new ServiceUnavailableException("Photo storage delete failed");
    }
  }

  private extensionForContentType(contentType: string): string {
    switch (contentType) {
      case "image/png":
        return "png";
      case "image/webp":
        return "webp";
      case "image/heic":
        return "heic";
      case "image/heif":
        return "heif";
      default:
        return "jpg";
    }
  }
}
