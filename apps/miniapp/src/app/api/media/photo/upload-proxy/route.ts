import { NextResponse } from "next/server";

/**
 * Proxy the file upload to B2 server-side.
 * This avoids CORS issues with direct browser→B2 uploads and moves SHA-1
 * computation to Node.js where crypto.subtle is always available.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const uploadUrl = formData.get("uploadUrl") as string | null;
    const authorizationToken = formData.get("authorizationToken") as string | null;
    const objectKey = formData.get("objectKey") as string | null;

    if (!file || !uploadUrl || !authorizationToken || !objectKey) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // iOS WebKit sometimes delivers an empty MIME type — default to JPEG
    const contentType = file.type && file.type !== "" ? file.type : "image/jpeg";

    const buffer = await file.arrayBuffer();

    // Compute SHA-1 server-side (avoids crypto.subtle availability issues on older WebViews)
    const hashBuffer = await crypto.subtle.digest("SHA-1", buffer);
    const sha1Hex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const b2Response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: authorizationToken,
        "Content-Type": contentType,
        "X-Bz-File-Name": encodeURIComponent(objectKey),
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
