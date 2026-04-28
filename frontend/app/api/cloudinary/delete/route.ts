import { v2 as cloudinary } from "cloudinary";

import { auth } from "@/lib/api/auth/server";
import { canAccessAdmin } from "@/lib/roles";

const PUBLIC_ID_PATTERN = /^[a-zA-Z0-9_\-./]+$/;

/**
 * Deletes an asset by public_id (signed uploads from admin widgets).
 * Restricted to admin-area roles; public_id must match a safe pattern.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !canAccessAdmin(session.user.role)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey =
    process.env.CLOUDINARY_API_KEY ?? process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return Response.json(
      { error: "Cloudinary is not configured on the server." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const publicId =
    body &&
    typeof body === "object" &&
    "publicId" in body &&
    typeof (body as { publicId: unknown }).publicId === "string"
      ? (body as { publicId: string }).publicId.trim()
      : "";

  if (!publicId || !PUBLIC_ID_PATTERN.test(publicId)) {
    return Response.json({ error: "Invalid publicId" }, { status: 400 });
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      invalidate: true,
    });
    return Response.json({ result: result.result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Destroy failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
