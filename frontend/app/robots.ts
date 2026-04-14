import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const vercelEnv = process.env.VERCEL_ENV ?? "development";
  const isProd = vercelEnv === "production" && !siteUrl.includes("staging.");

  return {
    rules: isProd
      ? {
          userAgent: "*",
          allow: "/",
          disallow: [
            "/admin",
            "/account",
            "/auth",
            "/api",
            "/checkout",
            "/cart",
            "/tracking/guest",
          ],
        }
      : { userAgent: "*", disallow: "/" },
    host: isProd ? siteUrl : undefined,
    sitemap: isProd ? `${siteUrl}/sitemap.xml` : undefined,
  };
}
