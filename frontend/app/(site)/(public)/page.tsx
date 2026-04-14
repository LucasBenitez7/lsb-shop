import FeaturedGrid from "@/features/home/components/FeaturedGrid";
import HeroSection from "@/features/home/components/HeroSection";
import InterestSection from "@/features/home/components/InterestSection";
import SaleBanner from "@/features/home/components/SaleBanner";

import { getFeaturedCategories } from "@/lib/api/categories";
import { getMaxDiscountPercentage } from "@/lib/api/products";
import { getStoreConfig } from "@/lib/settings/service";

import type { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Inicio",
  description:
    "Bienvenido a LSB Shop — moda moderna con estilo propio. Descubre novedades, rebajas y las mejores prendas seleccionadas para ti.",
  alternates: { canonical: "/" },
  openGraph: {
    url: "/",
    title: "LSB Shop — Moda moderna con estilo propio",
    description:
      "Ropa de calidad, novedades constantes y los mejores precios. Envío rápido a toda España.",
  },
};

export default async function HomePage() {
  const [config, maxDiscount, featuredCategories] = await Promise.all([
    getStoreConfig(),
    getMaxDiscountPercentage(),
    getFeaturedCategories(4),
  ]);

  return (
    <main className="flex min-h-screen flex-col">
      <HeroSection config={config} />
      {featuredCategories.length > 0 && (
        <FeaturedGrid categories={featuredCategories} />
      )}
      <SaleBanner config={config} maxDiscount={maxDiscount} />
      <InterestSection />
    </main>
  );
}
