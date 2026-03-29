import { Buffer } from "node:buffer";
import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { MINIAPP_SESSION_COOKIE } from "../../../../../lib/session";

type UploadIntentPayload = {
  kind: "photo_upload";
  userId: string;
  objectKey: string;
  contentType: string;
  uploadUrl: string;
  authorizationToken: string;
  maxBytes: number;
  exp: number;
};

const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

function verifyUploadIntentToken(token: string): UploadIntentPayload {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("SESSION_SECRET is not configured");
  }

  const [body, signature] = token.split(".", 2);

  if (!body || !signature) {
    throw new Error("Upload intent is invalid");
  }

  const expected = createHmac("sha256", secret).update(body).digest("base64url");

  if (
    expected.length !== signature.length ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  ) {
    throw new Error("Upload intent is invalid");
  }

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<UploadIntentPayload>;

  if (
    payload.kind !== "photo_upload" ||
    typeof payload.objectKey !== "string" ||
    typeof payload.contentType !== "string" ||
    typeof payload.uploadUrl !== "string" ||
    typeof payload.authorizationToken !== "string" ||
    typeof payload.maxBytes !== "number" ||
    typeof payload.exp !== "number"
  ) {
    throw new Error("Upload intent is invalid");
  }

  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error("Upload intent has expired");
  }

  return payload as UploadIntentPayload;
}

/**
 * Proxy the file upload to B2 server-side.
 * This avoids CORS issues with direct browser→B2 uploads and moves SHA-1
 * computation to Node.js where crypto.subtle is always available.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(MINIAPP_SESSION_COOKIE)?.value;

    if (!sessionToken) {
      return NextResponse.json({ message: "Mini App session is required" }, { status: 401 });
    }

    const contentLengthHeader = request.headers.get("content-length");

    if (contentLengthHeader) {
      const contentLength = Number(contentLengthHeader);

      if (!Number.isFinite(contentLength) || contentLength <= 0) {
        return NextResponse.json({ message: "Upload content-length is invalid" }, { status: 400 });
      }

      if (contentLength > 5 * 1024 * 1024 + MULTIPART_OVERHEAD_BYTES) {
        return NextResponse.json({ message: "Файл слишком большой. Максимальный размер — 5 МБ." }, { status: 413 });
      }
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const intentToken = formData.get("intentToken") as string | null;

    if (!file || !intentToken) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const intent = verifyUploadIntentToken(intentToken);

    // iOS WebKit sometimes delivers an empty MIME type — default to JPEG
    const contentType = file.type && file.type !== "" ? file.type : "image/jpeg";

    if (contentType !== intent.contentType) {
      return NextResponse.json({ message: "Upload content type mismatch" }, { status: 400 });
    }

    if (file.size <= 0 || file.size > intent.maxBytes) {
      return NextResponse.json({ message: "Файл слишком большой. Максимальный размер — 5 МБ." }, { status: 413 });
    }

    const buffer = await file.arrayBuffer();

    // Compute SHA-1 server-side (avoids crypto.subtle availability issues on older WebViews)
    const hashBuffer = await crypto.subtle.digest("SHA-1", buffer);
    const sha1Hex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const b2Response = await fetch(intent.uploadUrl, {
      method: "POST",
      headers: {
        Authorization: intent.authorizationToken,
        "Content-Type": contentType,
        "Content-Length": String(buffer.byteLength),
        "X-Bz-File-Name": encodeURIComponent(intent.objectKey),
        "X-Bz-Content-Sha1": sha1Hex
      },
      body: buffer
    });

    if (!b2Response.ok) {
      const errorText = await b2Response.text().catch(() => "");
      return NextResponse.json(
        { message: `Хранилище вернуло ошибку ${b2Response.status}${errorText ? `: ${errorText}` : ""}` },
        { status: 502 }
      );
    }

    const result = await b2Response.json();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Ошибка прокси-загрузки" },
      { status: 500 }
    );
  }
}
