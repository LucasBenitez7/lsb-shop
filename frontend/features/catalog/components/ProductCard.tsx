"use client";

import Link from "next/link";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

import { Button, FavoriteButton } from "@/components/ui";
import { Image } from "@/components/ui/image";

import { formatCurrency, DEFAULT_CURRENCY } from "@/lib/currency";
import { colorsMatch } from "@/lib/products/color-matching";
import { cn } from "@/lib/utils";

import { useProductCard } from "@/features/product/hooks/use-product-card";

import type { PublicProductListItem } from "@/lib/products/types";

export function ProductCard({
  item,
  initialIsFavorite = false,
  shortenTitle = false,
  onProductClick,
  imgSizes = "(max-width: 1280px) 50vw, 25vw",
}: {
  item: PublicProductListItem;
  initialIsFavorite?: boolean;
  shortenTitle?: boolean;
  onProductClick?: () => void;
  imgSizes?: string;
}) {
  const {
    imageContainerRef,
    showSizes,
    setShowSizes,
    sizes,
    colors,
    selectedColor,
    selectedSize,
    handleColorSelect,
    displayImage,
    productUrl,
    isOutOfStock,
    handleQuickAdd,
    cartItems,
    allImages,
    currentImageIndex,
    nextImage,
    prevImage,
  } = useProductCard(item);

  const displayName =
    shortenTitle && item.name.length > 40
      ? item.name.slice(0, 40) + "..."
      : item.name;

  const handleTouchStart = (e: React.TouchEvent<HTMLAnchorElement>) => {
    const touch = e.touches[0];
    (e.currentTarget as HTMLElement).dataset.startX = touch.clientX.toString();
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLAnchorElement>) => {
    const startX = parseFloat(
      (e.currentTarget as HTMLElement).dataset.startX || "0",
    );
    const endX = e.changedTouches[0].clientX;
    const diff = startX - endX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        nextImage();
      } else {
        prevImage();
      }
    }
    (e.currentTarget as HTMLElement).dataset.startX = "";
  };

  return (
    <div className="flex flex-col overflow-hidden bg-background h-full">
      <div
        ref={imageContainerRef}
        className="group/image relative aspect-[3/4] bg-neutral-100 overflow-hidden shrink-0"
      >
        {/* Imagen simple sin efectos */}
        <Link
          href={productUrl}
          className="block h-full w-full relative"
          onClick={onProductClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <Image
            src={displayImage}
            alt={item.name}
            fill
            sizes={imgSizes}
            className="object-cover"
          />
        </Link>

        {/* Image carousel navigation */}
        {allImages.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-1 top-1/2 -translate-y-1/2 z-10 flex lg:hidden group-hover/image:flex bg-transparent hover:bg-transparent active:bg-transparent rounded-full size-12 sm:size-8 p-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                prevImage();
              }}
            >
              <FaChevronLeft className="size-5 md:size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 z-10 flex lg:hidden group-hover/image:flex bg-transparent hover:bg-transparent active:bg-transparent rounded-full size-12 sm:size-8 p-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                nextImage();
              }}
            >
              <FaChevronRight className="size-5 md:size-4" />
            </Button>
          </>
        )}

        {/* Badge Agotado */}
        {isOutOfStock && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none bg-black/50">
            <div className="text-white/70 px-4 py-2 text-lg font-bold uppercase tracking-widest border-2 border-white/70">
              Agotado
            </div>
          </div>
        )}

        {/* Overlay de tallas */}
        {!isOutOfStock && sizes.length > 0 && (
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 p-3 items-end justify-center transition-all duration-300 text-foreground",
              "translate-y-4 opacity-0 hidden lg:flex",
              showSizes
                ? "flex translate-y-0 opacity-100"
                : "group-hover/image:translate-y-0 group-hover/image:opacity-100",
              "bg-white/90 backdrop-blur-[2px]",
            )}
          >
            <div className="flex flex-wrap justify-center gap-1.5 w-full">
              {sizes.map((size) => {
                const isSelected = selectedSize === size;

                const variantForButton = item.variants.find(
                  (v) =>
                    v.size === size &&
                    (selectedColor
                      ? colorsMatch(v.color, selectedColor)
                      : true),
                );

                const isAvailable =
                  variantForButton && variantForButton.stock > 0;

                const qtyInCart =
                  cartItems.find((i) => i.variantId === variantForButton?.id)
                    ?.quantity ?? 0;

                const isMaxedOutForThisSize = variantForButton
                  ? qtyInCart >= variantForButton.stock
                  : false;

                const isDisabled = !isAvailable || isMaxedOutForThisSize;

                return (
                  <button
                    key={size}
                    type="button"
                    disabled={isDisabled}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (isAvailable) {
                        handleQuickAdd(size);
                      }
                    }}
                    className={cn(
                      "h-7 w-8 lg:h-5 lg:w-auto rounded-xs mx-[4px] p-[1px] border-b-2 border-transparent text-sm font-medium transition-all text-foreground",
                      isDisabled &&
                        "opacity-50 hover:cursor-default border-transparent hover:border-transparent text-muted-foreground line-through",
                      !isDisabled &&
                        "hover:cursor-pointer hover:border-foreground active:bg-neutral-300 lg:active:bg-transparent  text-foreground",
                    )}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* --- ZONA DE INFORMACIÓN --- */}
      <div className="flex flex-col gap-2 px-2 pt-3 pb-2 flex-1 space-y-2 bg-background z-10 relative">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 w-full">
            <Link href={productUrl} className="flex" onClick={onProductClick}>
              <h3 className="text-sm font-medium leading-tight text-foreground line-clamp-1 hover:underline active:underline underline-offset-2">
                {displayName}
              </h3>
            </Link>
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              {item.compareAtPrice && item.compareAtPrice > item.priceCents && (
                <span className="text-muted-foreground line-through text-xs">
                  {formatCurrency(item.compareAtPrice, DEFAULT_CURRENCY)}
                </span>
              )}
              <span
                className={
                  item.compareAtPrice && item.compareAtPrice > item.priceCents
                    ? "text-red-600"
                    : ""
                }
              >
                {formatCurrency(item.priceCents, DEFAULT_CURRENCY)}
              </span>
            </p>
          </div>
          <FavoriteButton
            productId={item.id}
            initialIsFavorite={initialIsFavorite}
            className="shrink-0"
            iconSize="size-4.5"
          />
        </div>

        <div className="space-y-4">
          {/* --- SELECTOR DE TALLAS (Mobile) --- */}
          <div className="lg:hidden">
            {sizes.length > 1 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setShowSizes((prev) => !prev);
                }}
                className={cn(
                  "text-xs font-medium w-max transition-colors hover:cursor-pointer items-center flex justify-start",
                )}
              >
                {showSizes ? "Ocultar tallas" : `Ver tallas (${sizes.length})`}
              </button>
            ) : (
              <div className="h-6"></div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => {
                const variantWithColor = item.variants.find((v) =>
                  colorsMatch(v.color, color),
                );
                const hex = variantWithColor?.colorHex || "#e5e5e5";
                const isSelected = colorsMatch(selectedColor, color);

                return (
                  <button
                    key={color}
                    type="button"
                    title={color}
                    onClick={(e) => {
                      e.preventDefault();
                      handleColorSelect(color);
                    }}
                    className={cn(
                      "h-[16px] w-[16px] border transition-all focus:outline-none hover:cursor-pointer shadow-[0_8px_0_0_#fff]",
                      isSelected
                        ? "shadow-[0_2.5px_0_0_#fff,0_4px_0_0_#000]"
                        : "hover:shadow-[0_2.5px_0_0_#fff,0_4px_0_0_#000]",
                    )}
                    style={{ backgroundColor: hex }}
                  >
                    <span className="sr-only">{color}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
