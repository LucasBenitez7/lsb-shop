"use client";

import { useState, useEffect } from "react";
import Lightbox from "yet-another-react-lightbox";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";

import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";

import { Image } from "@/components/ui/image";

import { cn } from "@/lib/utils";

import type { ProductImage } from "@/lib/products/types";

export function Gallery({
  images,
  productName,
  initialMainImage,
  isOutOfStock,
}: {
  images: ProductImage[];
  productName: string;
  initialMainImage: string;
  isOutOfStock: boolean;
}) {
  const [mainImage, setMainImage] = useState(initialMainImage);
  const [openZoom, setOpenZoom] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);

  useEffect(() => {
    setMainImage(initialMainImage);
  }, [initialMainImage]);

  const handleOpenZoom = () => {
    const currentIndex = images.findIndex((img) => img.url === mainImage);
    setZoomIndex(currentIndex >= 0 ? currentIndex : 0);
    setOpenZoom(true);
  };

  if (!images.length) return <div className="bg-neutral-100 aspect-[3/4]" />;

  const currentImgObj = images.find((i) => i.url === mainImage) || images[0];

  return (
    <>
      {/* --- GRID EN LA PÁGINA --- */}
      <div className="flex flex-col-reverse lg:flex-row gap-3 w-full">
        {images.length > 1 && (
          <div className="flex gap-3 overflow-x-auto lg:flex-col lg:w-20 lg:h-[85vh] lg:max-h-[600px] lg:overflow-y-auto scrollbar-hide shrink-0 pb-2 lg:pb-0">
            {images.map((img, idx) => (
              <button
                key={`${img.url}-${idx}`}
                onClick={() => setMainImage(img.url)}
                className={cn(
                  "relative h-20 w-16 lg:h-24 lg:w-full shrink-0 overflow-hidden rounded-xs border transition-all cursor-pointer",
                  mainImage === img.url
                    ? "border-foreground"
                    : "border-transparent hover:border-foreground",
                )}
              >
                <Image
                  src={img.url}
                  alt={`Minuatura ${idx + 1}`}
                  fill
                  unoptimized={true}
                  className="object-cover"
                  sizes="150px"
                />
              </button>
            ))}
          </div>
        )}

        <div
          onClick={handleOpenZoom}
          className="relative w-full aspect-[3/4] lg:aspect-auto lg:h-[85vh] lg:max-h-[800px] bg-neutral-50 rounded-xs overflow-hidden cursor-zoom-in group"
        >
          <Image
            src={mainImage}
            alt={currentImgObj?.alt ?? productName}
            fill
            priority
            className={cn(
              "object-cover transition-all duration-500",
              isOutOfStock && "opacity-50 grayscale-[0.5]",
            )}
            sizes="(max-width: 768px) 100vw, 800px"
          />
          {isOutOfStock && (
            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none bg-black/10">
              <div className="bg-black/70 text-white px-4 py-2 text-sm font-bold uppercase tracking-widest backdrop-blur-sm">
                Agotado
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        /* Borde negro en la miniatura activa dentro del lightbox */
        .yarl__thumbnails_thumbnail_active {
          border: 1px solid #000000;
        }
        .yarl__thumbnails_thumbnail {
          border-radius: 2px;
        }
      `}</style>

      <Lightbox
        open={openZoom}
        close={() => setOpenZoom(false)}
        index={zoomIndex}
        slides={images.map((img) => ({ src: img.url, alt: img.alt }))}
        plugins={[Zoom, Thumbnails]}
        on={{ view: ({ index }) => setZoomIndex(index) }}
        styles={{
          root: { "--yarl__color_backdrop": "#ffffff" },
          icon: { color: "#000000" },
        }}
        // Configuración de funcionalidad
        animation={{ swipe: 250, zoom: 300 }}
        zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
        thumbnails={{
          position: "start",
          width: 80,
          height: 100,
          border: 0,
          gap: 16,
          padding: 0,
          imageFit: "cover",
          vignette: false,
        }}
        render={{
          buttonPrev: () => null,
          buttonNext: () => null,
          buttonZoom: () => null,
        }}
      />
    </>
  );
}
