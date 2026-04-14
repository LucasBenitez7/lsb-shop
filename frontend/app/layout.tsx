import "./globals.css";
import { Suspense } from "react";
import { Toaster } from "sonner";

import { ScrollToTop } from "@/components/layout/ScrollToTop";
import Providers from "@/app/providers";

import { fontMono, fontSans } from "./fonts";

import type { Metadata, Viewport } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const siteName = "LSB Shop";
const description =
  "Descubre moda moderna con estilo propio. Ropa de calidad, novedades constantes y los mejores precios — envío rápido a toda España.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: siteName, template: `%s · ${siteName}` },
  description,
  alternates: { canonical: "/" },
  icons: {
    icon: [
      {
        url: "/images/favicon-light.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/images/favicon-dark.png",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: "/images/favicon-light.png",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName,
    title: siteName,
    description,
    locale: "es_ES",
    images: [
      {
        url: "/og/default.png",
        width: 1200,
        height: 630,
        alt: `${siteName} — portada`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description,
    images: ["/og/default.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`h-full ${fontSans.variable} ${fontMono.variable}`}
    >
      <body className="min-h-dvh text-foreground font-sans">
        <Providers>
          <Suspense fallback={null}>
            <ScrollToTop />
          </Suspense>
          {children}
          <Toaster position="bottom-center" richColors />
        </Providers>
      </body>
    </html>
  );
}
