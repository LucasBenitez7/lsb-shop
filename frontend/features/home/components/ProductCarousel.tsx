"use client";

import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import { useEffect, useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

import { CarouselCard } from "@/features/home/components/CarouselCard";
import { Button } from "@/components/ui/button";

import type { PublicProductListItem } from "@/lib/products/types";

interface ProductCarouselProps {
  products: PublicProductListItem[];
}

export function ProductCarousel({ products }: ProductCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start", slidesToScroll: 1 },
    [Autoplay({ delay: 5000, stopOnInteraction: true })],
  );
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;

    const updateScrollButtons = () => {
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    };

    emblaApi.on("select", updateScrollButtons);
    emblaApi.on("reInit", updateScrollButtons);
    updateScrollButtons();
  }, [emblaApi]);

  const scrollPrev = () => emblaApi && emblaApi.scrollPrev();
  const scrollNext = () => emblaApi && emblaApi.scrollNext();

  if (!products.length) return null;

  return (
    <div className="relative group">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {products.map((product) => (
            <div
              key={product.id}
              className="min-w-0 flex-[0_0_80%] sm:flex-[0_0_50%] md:flex-[0_0_33.33%] lg:flex-[0_0_25%] pl-1"
            >
              <CarouselCard product={product} />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <Button
        variant="outline"
        size="icon"
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 hidden group-hover:flex bg-neutral-100 shadow-md hover:bg-white rounded-full border-neutral-200"
        onClick={scrollPrev}
        disabled={!canScrollPrev}
      >
        <FaChevronLeft className="size-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 hidden group-hover:flex bg-neutral-100 shadow-md hover:bg-white rounded-full border-neutral-200"
        onClick={scrollNext}
        disabled={!canScrollNext}
      >
        <FaChevronRight className="size-4" />
      </Button>
    </div>
  );
}
