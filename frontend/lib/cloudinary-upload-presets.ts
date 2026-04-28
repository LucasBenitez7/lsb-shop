/**
 * Cloudinary upload presets for this project (Dashboard → Upload presets).
 * Both presets are **Signed**; the browser must call `/api/sign-cloudinary-params`
 * (`NEXT_PUBLIC_CLOUDINARY_API_KEY` + server `CLOUDINARY_API_SECRET`).
 *
 * Override names via `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_*` if you fork the project.
 */

/** Product gallery + variant images (`lsb_shop` in Cloudinary). */
export const CLOUDINARY_UPLOAD_PRESET_PRODUCTS_DEFAULT = "lsb_shop";

/** Categories, hero/sale blocks, store settings visuals (`lsb_shop_banners`). */
export const CLOUDINARY_UPLOAD_PRESET_BANNERS_DEFAULT = "lsb_shop_banners";

export function getCloudinaryProductUploadPreset(): string {
  return (
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_PRODUCTS ||
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ||
    CLOUDINARY_UPLOAD_PRESET_PRODUCTS_DEFAULT
  );
}

export function getCloudinaryBannerUploadPreset(): string {
  return (
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_BANNERS ||
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ||
    CLOUDINARY_UPLOAD_PRESET_BANNERS_DEFAULT
  );
}

/**
 * Signed presets: widget POSTs to this route; Next signs with `CLOUDINARY_API_SECRET`.
 * Omit when `NEXT_PUBLIC_CLOUDINARY_API_KEY` is unset (page loads; uploads fail for Signed presets).
 *
 * @see https://next.cloudinary.dev/clduploadwidget/signed-uploads
 */
export function getCloudinarySignatureEndpoint(): string | undefined {
  return process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY
    ? "/api/sign-cloudinary-params"
    : undefined;
}
