import { RelatedProducts } from "@/features/catalog/components/RelatedProducts";

import { getUserFavoriteIds } from "@/lib/api/favorites/server";

import CartClientPage from "../../../../features/cart/components/CartClientPage";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Carrito",
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const favoriteIds = await getUserFavoriteIds();

  return (
    <>
      <CartClientPage favoriteIds={favoriteIds} />
      <RelatedProducts title="Te podría interesar" />
    </>
  );
}
