import { NextResponse } from "next/server";
import { proxyMiniAppApi } from "../../../../lib/api-proxy";

export async function DELETE(): Promise<Response> {
  const response = await proxyMiniAppApi("/api/media/photo", {
    method: "DELETE"
  });

  if (!response.ok) {
    return NextResponse.json(
      { message: "Unable to delete photo" },
      { status: response.status }
    );
  }

  return new Response(null, { status: 204 });
}
