import { NextResponse } from "next/server";
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
  const sessionToken = request.headers.get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${MINIAPP_SESSION_COOKIE}=`))
    ?.replace(`${MINIAPP_SESSION_COOKIE}=`, "");

  if (sessionToken) {
    await fetch(`${getApiBaseUrl()}/api/auth/revoke`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${decodeURIComponent(sessionToken)}`
      },
      cache: "no-store"
    });
  }

  const response = NextResponse.json({}, { status: 204 });
  response.cookies.delete(MINIAPP_SESSION_COOKIE);
  return response;
}
