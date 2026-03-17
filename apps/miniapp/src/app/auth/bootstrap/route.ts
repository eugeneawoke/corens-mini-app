import { NextResponse } from "next/server";
import type { AuthBootstrapRequest, AuthBootstrapResponse } from "@corens/domain";
import { MINIAPP_SESSION_COOKIE } from "../../../lib/session";

function getApiBaseUrl(): string {
  const baseUrl =
    process.env.CORENS_API_BASE_URL ?? process.env.NEXT_PUBLIC_CORENS_API_BASE_URL ?? "";

  if (!baseUrl) {
    throw new Error("CORENS_API_BASE_URL is not configured");
  }

  return baseUrl.replace(/\/$/, "");
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as AuthBootstrapRequest;
  const response = await fetch(`${getApiBaseUrl()}/api/auth/bootstrap`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  if (!response.ok) {
    return NextResponse.json(
      { message: "Unable to bootstrap session" },
      { status: response.status }
    );
  }

  const payload = (await response.json()) as AuthBootstrapResponse;
  const nextResponse = NextResponse.json({
    user: payload.user,
    profile: payload.profile,
    expiresAt: payload.expiresAt
  });

  nextResponse.cookies.set(MINIAPP_SESSION_COOKIE, payload.sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(payload.expiresAt),
    path: "/"
  });

  return nextResponse;
}
