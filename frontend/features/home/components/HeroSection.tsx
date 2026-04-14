"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

import { homeConfig } from "@/lib/home-config";

import type { StoreConfig } from "@/types/store";

const MOBILE_BREAKPOINT = 768;

interface Props {
  config: StoreConfig | null;
}

export default function HeroSection({ config }: Props) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    setIsMobileViewport(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobileViewport(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    setImageLoaded(false);
  }, [config?.heroImageUrl, config?.heroImageUrlMobile]);

  useEffect(() => {
    const fallback = setTimeout(() => setImageLoaded(true), 2000);
    return () => clearTimeout(fallback);
  }, []);

  const hero = {
    desktopSrc: config?.heroImageUrl || homeConfig.hero.src,
    mobileSrc:
      config?.heroImageUrlMobile ||
      config?.heroImageUrl ||
      homeConfig.hero.src,
    title: config?.heroTitle || "",
    subtitle: config?.heroSubtitle || "",
    ctaLink: config?.heroCta || "/novedades",
    overlayOpacity: homeConfig.hero.overlayOpacity,
  };

  return (
    <section className="relative h-[95vh] w-full overflow-hidden mb-[-1px]">
      {/* BACKGROUND MEDIA */}
      <div className="absolute inset-0 size-full">
        {/* Mobile Image */}
        <div className="block md:hidden size-full relative">
          <Image
            src={hero.mobileSrc}
            alt="Hero Background Mobile"
            fill
            priority
            quality={90}
            className="object-cover"
            sizes="100vw"
            onLoad={() => isMobileViewport && setImageLoaded(true)}
          />
        </div>

        {/* Desktop Image */}
        <div className="hidden md:block size-full relative">
          <Image
            src={hero.desktopSrc}
            alt="Hero Background Desktop"
            fill
            priority
            quality={90}
            className="object-cover"
            sizes="(min-width: 1920px) 2560px, (min-width: 1200px) 1920px, 100vw"
            onLoad={() => !isMobileViewport && setImageLoaded(true)}
          />
        </div>

        {/* OVERLAY — opacidad solo sobre el color, no el elemento entero */}
        <div
          className="absolute inset-0"
          style={{ opacity: imageLoaded ? hero.overlayOpacity : 0 }}
        />
      </div>

      {/* CONTENT */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center text-white sm:px-6 lg:px-8">
        <AnimatePresence>
          {imageLoaded && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="max-w-3xl space-y-6"
            >
              <h1 className="text-4xl font-bold tracking-wide sm:text-5xl lg:text-6xl text-white">
                {hero.title}
              </h1>
              {hero.subtitle && (
                <p className="mt-2 mb-6 text-lg text-white sm:text-xl md:text-2xl font-normal opacity-90">
                  {hero.subtitle}
                </p>
              )}
              <div className="flex justify-center gap-4">
                <Button
                  asChild
                  className="bg-white text-foreground hover:bg-neutral-200 hover:text-foreground rounded-none px-8 h-12 text-base font-medium tracking-wider transition-all duration-300"
                >
                  <Link href={hero.ctaLink}>VER NOVEDADES</Link>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
