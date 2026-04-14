"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useMemo, useCallback } from "react";

import type { PublicProductDetail } from "@/lib/products/types";

type UseProductDetailProps = {
  product: PublicProductDetail;
  initialImage: string;
  initialColor: string | null;
};

export function useProductDetail({
  product,
  initialImage,
  initialColor,
}: UseProductDetailProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedColor, setSelectedColor] = useState<string | null>(
    initialColor,
  );

  const filteredImages = useMemo(() => {
    if (!selectedColor) return product.images;
    const matches = product.images.filter(
      (img) => !img.color || img.color === selectedColor,
    );
    return matches.length > 0 ? matches : product.images;
  }, [product.images, selectedColor]);

  const currentMainImage = useMemo(() => {
    const exists = filteredImages.find((img) => img.url === initialImage);
    return exists ? initialImage : filteredImages[0]?.url;
  }, [filteredImages, initialImage]);

  const isOutOfStock = useMemo(
    () => product.variants.every((v) => v.stock === 0),
    [product.variants],
  );

  const handleColorChange = useCallback(
    (newColor: string) => {
      setSelectedColor(newColor);

      const params = new URLSearchParams(searchParams.toString());
      params.set("color", newColor);

      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return {
    selectedColor,
    filteredImages,
    currentMainImage,
    isOutOfStock,
    handleColorChange,
  };
}
