"use client";

import { motion } from "framer-motion";

import { ProductGrid } from "@/features/catalog/components/ProductGrid";

import type { PublicProductListItem } from "@/lib/products/types";

interface Props {
  title: string;
  products: PublicProductListItem[];
  favoriteIds: Set<string>;
}

export function RelatedProductsSection({
  title,
  products,
  favoriteIds,
}: Props) {
  return (
    <motion.section
      className="py-8 w-full mx-auto"
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      viewport={{ once: true, amount: 0.05 }}
    >
      <h2 className="text-xl text-center sm:text-left font-medium mb-6 px-6">
        {title}
      </h2>
      <ProductGrid
        items={products}
        favoriteIds={favoriteIds}
        shortenTitle
        gridSize={{ mobile: 1, desktop: 4 }}
      />
    </motion.section>
  );
}
