import { Buffer } from "node:buffer";
import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export type UploadIntentPayload = {
  kind: "photo_upload";
  userId: string;
  objectKey: string;
  contentType: string;
  uploadUrl: string;
  authorizationToken: string;
  maxBytes: number;
  exp: number;
};

export class UploadProxyError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

export function getApiBaseUrl(): string {
  const baseUrl =
    process.env.CORENS_API_BASE_URL ?? process.env.NEXT_PUBLIC_CORENS_API_BASE_URL ?? "";

  if (!baseUrl) {
    throw new UploadProxyError("Mini App backend is not configured", 500);
  }

  return baseUrl.replace(/\/$/, "");
}

export function verifyUploadIntentToken(token: string): UploadIntentPayload {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new UploadProxyError("Upload intent is invalid", 400);
  }

  const [body, signature] = token.split(".", 2);

  if (!body || !signature) {
    throw new UploadProxyError("Upload intent is invalid", 400);
  }

  const expected = createHmac("sha256", secret).update(body).digest("base64url");

  if (
    expected.length !== signature.length ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  ) {
    throw new UploadProxyError("Upload intent is invalid", 400);
  }

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<UploadIntentPayload>;

  if (
    payload.kind !== "photo_upload" ||
    typeof payload.userId !== "string" ||
    typeof payload.objectKey !== "string" ||
    typeof payload.contentType !== "string" ||
    typeof payload.uploadUrl !== "string" ||
    typeof payload.authorizationToken !== "string" ||
    typeof payload.maxBytes !== "number" ||
    typeof payload.exp !== "number"
  ) {
    throw new UploadProxyError("Upload intent is invalid", 400);
  }

  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new UploadProxyError("Upload intent has expired", 400);
  }

  return payload as UploadIntentPayload;
}

export async function authenticateUploadSession(sessionToken: string): Promise<{ id: string }> {
  const response = await fetch(`${getApiBaseUrl()}/api/auth/session`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${sessionToken}`
    },
    cache: "no-store"
  });

  if (response.status === 401 || response.status === 403) {
    throw new UploadProxyError("Mini App session is invalid", 401);
  }

  if (!response.ok) {
    throw new UploadProxyError("Unable to validate Mini App session", 502);
  }

  const payload = await response.json() as { user?: { id?: string } };
  const userId = payload.user?.id;

  if (!userId) {
    throw new UploadProxyError("Unable to validate Mini App session", 502);
  }

  return { id: userId };
}

export function buildStorageFailureResponse(status: number): Response {
  console.warn("Photo upload proxy storage failure", { status });
  return NextResponse.json(
    { message: "Не удалось загрузить файл в хранилище. Попробуйте ещё раз." },
    { status: 502 }
  );
}
