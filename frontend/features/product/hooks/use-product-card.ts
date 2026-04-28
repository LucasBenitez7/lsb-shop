import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";

import { addCartItem } from "@/lib/api/cart";
import { colorsMatch } from "@/lib/products/color-matching";
import { type PublicProductListItem } from "@/lib/products/types";
import {
  getUniqueColors,
  getUniqueSizes,
  findVariant,
  sortVariantsHelper,
} from "@/lib/products/utils";

import { useCartStore } from "@/store/useCartStore";
import { useStore } from "@/store/useStore";
import { useProductPreferences } from "@/store/useUIStore";

export function useProductCard(item: PublicProductListItem) {
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [showSizes, setShowSizes] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sortedVariants = useMemo(() => {
    return sortVariantsHelper(item.variants);
  }, [item.variants]);

  // --- STORE ---
  const { selectedColors, setProductColor } = useProductPreferences();
  const savedColor = selectedColors[item.slug];
  const replaceItems = useCartStore((state) => state.replaceItems);
  const storeItems = useStore(useCartStore, (state) => state.items);
  const cartItems = isMounted && storeItems ? storeItems : [];

  // --- LÓGICA DE DATOS ---
  const sizes = useMemo(() => getUniqueSizes(sortedVariants), [sortedVariants]);

  const colors = useMemo(() => {
    const stockVariants = sortedVariants.filter((v) => v.stock > 0);
    return getUniqueColors(stockVariants);
  }, [sortedVariants]);

  // --- ESTADOS ---
  const defaultColor = useMemo(() => {
    if (isMounted && savedColor && colors.includes(savedColor)) {
      return savedColor;
    }
    return colors.length > 0 ? colors[0] : null;
  }, [isMounted, savedColor, colors]);

  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  // Sincronizar con defaultColor calculado
  useEffect(() => {
    setSelectedColor(defaultColor);
  }, [defaultColor]);

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // --- HANDLERS ---
  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setProductColor(item.slug, color);
    setCurrentImageIndex(0);
  };

  // Image carousel handlers - FILTRADO POR COLOR
  const allImages = useMemo(() => {
    if (!item.images || item.images.length === 0) {
      if (item.thumbnail) {
        return [{ url: item.thumbnail, color: null, sort: 0 }];
      }
      return [];
    }

    const colorImages = item.images.filter(
      (img) => !img.color || colorsMatch(img.color, selectedColor),
    );

    // Si hay imágenes del color seleccionado, usarlas
    if (colorImages.length > 0) {
      return colorImages;
    }

    // Fallback: si no hay imágenes para ese color, usar thumbnail
    if (item.thumbnail) {
      return [{ url: item.thumbnail, color: null, sort: 0 }];
    }

    return [];
  }, [item.images, item.thumbnail, selectedColor]);

  // Reset index cuando cambia el número de imágenes disponibles
  useEffect(() => {
    if (currentImageIndex >= allImages.length && allImages.length > 0) {
      setCurrentImageIndex(0);
    }
  }, [allImages.length, currentImageIndex]);

  const nextImage = useCallback(() => {
    if (allImages.length <= 1) return;
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  }, [allImages.length]);

  const prevImage = useCallback(() => {
    if (allImages.length <= 1) return;
    setCurrentImageIndex((prev) =>
      prev === 0 ? allImages.length - 1 : prev - 1,
    );
  }, [allImages.length]);

  // --- DERIVADOS ---
  const displayImage = useMemo(() => {
    if (allImages.length > 0 && allImages[currentImageIndex]) {
      return allImages[currentImageIndex].url;
    }
    return item.thumbnail || "";
  }, [allImages, currentImageIndex, item.thumbnail]);

  const selectedVariant = useMemo(() => {
    return findVariant(sortedVariants, selectedColor, selectedSize);
  }, [sortedVariants, selectedColor, selectedSize]);

  const productUrl = `/product/${item.slug}${
    selectedColor ? `?color=${encodeURIComponent(selectedColor)}` : ""
  }`;

  const cartQty = useMemo(() => {
    if (!selectedVariant) return 0;
    return (
      cartItems.find((i) => i.variantId === selectedVariant.id)?.quantity ?? 0
    );
  }, [cartItems, selectedVariant]);

  const isCombinationValid = selectedVariant
    ? selectedVariant.stock > 0
    : false;
  const isMaxedOut =
    selectedVariant &&
    cartQty >= selectedVariant.stock &&
    selectedVariant.stock > 0;
  const isOutOfStock = item.totalStock === 0;

  // --- ACCIONES ---
  const handleQuickAdd = (size: string) => {
    const variantToAdd = sortedVariants.find(
      (v) =>
        v.size === size &&
        (selectedColor ? colorsMatch(v.color, selectedColor) : true) &&
        v.stock > 0,
    );

    if (!variantToAdd) return;

    const currentQty =
      cartItems.find((i) => i.variantId === variantToAdd.id)?.quantity ?? 0;

    if (currentQty >= variantToAdd.stock) {
      toast.error("Stock máximo alcanzado", {
        description: `Solo hay ${variantToAdd.stock} disponibles`,
        duration: 2000,
      });
      return;
    }

    void (async () => {
      try {
        const items = await addCartItem(Number(variantToAdd.id), 1);
        replaceItems(items);
        toast.success("Añadido al carrito", {
          description: `${item.name} - ${variantToAdd.size}`,
          duration: 2000,
        });
      } catch {
        toast.error("No se pudo añadir al carrito.");
      }
    })();
  };

  return {
    imageContainerRef,
    showSizes,
    setShowSizes,
    sizes,
    colors,
    selectedColor,
    selectedSize,
    setSelectedSize,
    handleColorSelect,
    displayImage,
    selectedVariant,
    productUrl,
    isOutOfStock,
    isCombinationValid,
    isMaxedOut,
    cartItems,
    isMounted,
    handleQuickAdd,
    allImages,
    currentImageIndex,
    nextImage,
    prevImage,
  };
}
