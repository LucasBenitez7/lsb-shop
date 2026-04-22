import Link from "next/link";
import { redirect } from "next/navigation";
import { FaHeartBroken } from "react-icons/fa";

import { ProductGrid } from "@/features/catalog/components/ProductGrid";
import { Button } from "@/components/ui/button";

import { auth } from "@/lib/api/auth/server";
import { getUserFavorites } from "@/lib/api/favorites/server";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mis favoritos",
  description:
    "Consulta y gestiona los productos que has guardado como favoritos en LSB Shop.",
  robots: { index: false, follow: false },
};

export default async function FavoritesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login?redirectTo=/favoritos");
  }

  const favorites = await getUserFavorites();

  const favoriteIds = new Set(favorites.map((f) => f.id));

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl text-center sm:text-left font-semibold pb-2 border-b border-neutral-300">
          Mis Favoritos
        </h2>
      </div>

      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <div className="bg-neutral-100 p-6 rounded-full">
            <FaHeartBroken className="size-12 text-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Aún no tienes favoritos</h2>
          <p className="text-muted-foreground max-w-md">
            Guarda los productos que más te gusten para comprarlos más tarde.
          </p>
          <Button asChild className="mt-4">
            <Link href="/catalogo">Explorar Catálogo</Link>
          </Button>
        </div>
      ) : (
        <ProductGrid
          items={favorites}
          favoriteIds={favoriteIds}
          className="lg:grid-cols-3"
          shortenTitle={false}
        />
      )}
    </section>
  );
}
