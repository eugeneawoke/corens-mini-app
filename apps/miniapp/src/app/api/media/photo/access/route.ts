import { NextResponse } from "next/server";
import { proxyMiniAppApi } from "../../../../../lib/api-proxy";

export async function GET(request: Request): Promise<Response> {
  const token = new URL(request.url).searchParams.get("token");

  if (!token) {
    return NextResponse.json({ message: "Photo access token is required" }, { status: 400 });
  }

  const response = await proxyMiniAppApi(`/api/media/photo/access?token=${encodeURIComponent(token)}`, {
    method: "GET"
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({})) as { message?: string };
    return NextResponse.json(
      { message: errorBody.message ?? "Unable to load photo asset" },
      { status: response.status }
    );
  }

  return new Response(await response.arrayBuffer(), {
    status: 200,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/octet-stream",
      "cache-control": "private, no-store"
    }
  });
}
