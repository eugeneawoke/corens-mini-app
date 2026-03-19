import { NextResponse } from "next/server";
import type { ConfirmPhotoUploadRequest, PhotoSummary } from "@corens/domain";
import { proxyMiniAppApi } from "../../../../../lib/api-proxy";

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as ConfirmPhotoUploadRequest;
  const response = await proxyMiniAppApi("/api/media/photo/confirm", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    return NextResponse.json(
      { message: "Unable to confirm photo upload" },
      { status: response.status }
    );
  }

  return NextResponse.json((await response.json()) as PhotoSummary);
}
