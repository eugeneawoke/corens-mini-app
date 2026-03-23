import { NextResponse } from "next/server";
import type { CreatePhotoUploadIntentRequest, PhotoUploadIntent } from "@corens/domain";
import { proxyMiniAppApi } from "../../../../../lib/api-proxy";

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as CreatePhotoUploadIntentRequest;
  const response = await proxyMiniAppApi("/api/media/photo/upload-intent", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({})) as { message?: string };
    return NextResponse.json(
      { message: errorBody.message ?? "Unable to create photo upload intent" },
      { status: response.status }
    );
  }

  return NextResponse.json((await response.json()) as PhotoUploadIntent);
}
