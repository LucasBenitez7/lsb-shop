/**
 * Canonical public site origin for metadata, JSON-LD, sitemap, and robots.
 * Set `NEXT_PUBLIC_SITE_URL` in production (e.g. https://shop.lsbstack.com).
 */
export function getPublicSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    return raw.replace(/\/+$/, "");
  }
  return "http://localhost:3000";
}
