import { cookies } from "next/headers";
import { MINIAPP_SESSION_COOKIE } from "./session";

function getApiBaseUrl(): string {
  const baseUrl =
    process.env.CORENS_API_BASE_URL ?? process.env.NEXT_PUBLIC_CORENS_API_BASE_URL ?? "";

  if (!baseUrl) {
    throw new Error("CORENS_API_BASE_URL is not configured");
  }

  return baseUrl.replace(/\/$/, "");
}

export async function proxyMiniAppApi(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(MINIAPP_SESSION_COOKIE)?.value;

  if (!sessionToken) {
    return new Response(JSON.stringify({ message: "Mini App session is required" }), {
      status: 401,
      headers: {
        "content-type": "application/json"
      }
    });
  }

  return fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${sessionToken}`,
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });
}
