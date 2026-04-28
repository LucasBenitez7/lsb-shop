import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import { homeConfig } from "@/lib/home-config";

import type { StoreConfig } from "@/types/store";

interface Props {
  config: StoreConfig | null;
  maxDiscount?: number;
}

export default function SaleBanner({ config, maxDiscount = 0 }: Props) {
  const defaults = homeConfig.saleBanner;

  const sale = {
    title: config?.saleTitle || "REBAJAS",
    subtitle:
      config?.saleSubtitle || (maxDiscount > 0 ? `-${maxDiscount}%` : ""),
    desktopSrc: config?.saleImageUrl || defaults.backgroundImage,
    mobileSrc:
      config?.saleImageUrlMobile ||
      config?.saleImageUrl ||
      defaults.backgroundImage,
    backgroundColor: config?.saleBackgroundColor || defaults.backgroundColor,
    ctaLink: config?.saleLink || "/rebajas",
    ctaText: "VER REBAJAS",
    footerText: "",
  };

  const hasImage = !!sale.desktopSrc;

  return (
    <section className="relative w-full py-24 h-[95vh] flex items-center justify-center text-center overflow-hidden bg-black">
      {/* Background Image */}
      {hasImage ? (
        <div className="absolute inset-0 size-full">
          {/* Mobile Image */}
          <div className="block md:hidden size-full relative">
            <Image
              src={sale.mobileSrc}
              alt="Sale Background Mobile"
              fill
              priority
              quality={90}
              className="object-cover opacity-100"
              sizes="(max-width: 767px) 100vw, 1px"
            />
          </div>

          {/* Desktop Image */}
          <div className="hidden md:block size-full relative">
            <Image
              src={sale.desktopSrc}
              alt="Sale Background Desktop"
              fill
              priority
              quality={90}
              className="object-cover opacity-100"
              sizes="(min-width: 1920px) 2560px, (min-width: 768px) 100vw, 1px"
            />
          </div>
          <div className="absolute inset-0" />
        </div>
      ) : (
        <div
          className="absolute inset-0 size-full"
          style={{ backgroundColor: sale.backgroundColor }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 max-w-4xl px-4 text-red-600">
        <h2 className="text-5xl font-semibold sm:text-6xl lg:text-8xl uppercase tracking-widest mb-6">
          {sale.title}
        </h2>
        {maxDiscount > 0 && (
          <>
            <p className="text-xl">Hasta</p>
            <p className="my-6 text-4xl font-semibold sm:text-8xl tracking-wide">
              {sale.subtitle}
            </p>
          </>
        )}

        <Button
          asChild
          variant="default"
          size="lg"
          className="bg-red-600 text-white hover:bg-red-500 border-none rounded-none px-10 h-12 text-base font-medium"
        >
          <Link href={sale.ctaLink}>VER REBAJAS</Link>
        </Button>
      </div>

      <p className="mb-8 bottom-0 absolute z-20 text-red-600 text-xs tracking-widest">
        {sale.footerText}
      </p>
    </section>
  );
}
