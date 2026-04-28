import { v2 as cloudinary } from "cloudinary";

/**
 * Signs upload parameters for `CldUploadWidget` when using signed upload presets.
 *
 * @see https://next.cloudinary.dev/clduploadwidget/signed-uploads
 */
export async function POST(request: Request) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey =
    process.env.CLOUDINARY_API_KEY ?? process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return Response.json(
      {
        error:
          "Cloudinary signing is not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, NEXT_PUBLIC_CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
      },
      { status: 503 },
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  const body: unknown = await request.json();
  const paramsToSign =
    body &&
    typeof body === "object" &&
    "paramsToSign" in body &&
    body.paramsToSign &&
    typeof body.paramsToSign === "object"
      ? (body.paramsToSign as Record<string, string | number | boolean>)
      : null;

  if (!paramsToSign) {
    return Response.json({ error: "Missing paramsToSign" }, { status: 400 });
  }

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return Response.json({ signature });
}
