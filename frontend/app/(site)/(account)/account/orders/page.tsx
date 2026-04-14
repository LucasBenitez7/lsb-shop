import Link from "next/link";
import { FaBoxOpen } from "react-icons/fa6";

import { OrderHistoryCard } from "@/features/orders/components/OrderHistoryCard";
import { PaginationNav } from "@/features/catalog/components/PaginationNav";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";

import { getUserOrders } from "@/lib/api/account";
import { auth } from "@/lib/auth/server";
import { ORDER_TABS } from "@/lib/orders/constants";
import { cn } from "@/lib/utils";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mis pedidos",
  description: "Consulta y gestiona todos tus pedidos realizados en LSB Shop.",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{
    page?: string;
    status?: string;
    q?: string;
  }>;
};

export default async function AccountOrdersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  const statusTab = sp.status;
  const query = sp.q || "";

  const session = await auth();

  if (!session?.user?.id) return null;

  const { orders, totalPages, totalCount } = await getUserOrders({
    page,
    limit: 5,
    status: statusTab,
    q: query,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 border-b border-neutral-300 pb-3">
          <h2 className="text-2xl font-semibold">Mis Pedidos ({totalCount})</h2>

          <div className="flex min-w-[200px] w-full sm:w-[480px]">
            <SearchInput placeholder="Buscar pedidos..." />
          </div>
        </div>

        {/* --- PESTAÑAS DE NAVEGACIÓN --- */}
        <div className="flex gap-4 text-sm sm:text-base overflow-x-auto pb-1 scrollbar-hide">
          {ORDER_TABS.map((tab) => {
            const isActive =
              statusTab === tab.value || (!statusTab && !tab.value);

            return (
              <Link
                key={tab.label}
                href={
                  tab.value
                    ? `/account/orders?status=${tab.value}`
                    : "/account/orders"
                }
                className={cn(
                  "pb-2 border-b-2 font-medium transition-colors whitespace-nowrap px-1",
                  isActive
                    ? "border-foreground text-foreground"
                    : "border-transparent text-neutral-500 hover:text-neutral-800 hover:border-neutral-300",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* --- LISTADO DE PEDIDOS --- */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xs border p-12 text-center bg-neutral-50 mt-4">
          <div className="p-4 bg-white rounded-full shadow-sm mb-4">
            <FaBoxOpen className="size-8 text-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {query
              ? "No se encontraron resultados"
              : "No hay pedidos para mostrar"}
          </h3>
          <p className="text-muted-foreground mb-4 text-sm max-w-sm mx-auto">
            {query
              ? `No hay coincidencias para "${query}"`
              : statusTab
                ? "No tienes pedidos en este estado."
                : "Aún no has realizado ningún pedido."}
          </p>

          {!statusTab && !query && (
            <Button asChild>
              <Link href="/catalogo">Ir a la tienda</Link>
            </Button>
          )}

          {(statusTab || query) && (
            <Button variant="default" asChild>
              <Link href="/account/orders">
                {query ? "Limpiar búsqueda" : "Ver todos los pedidos"}
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <OrderHistoryCard key={order.id} order={order} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pt-4 border-t">
          <PaginationNav totalPages={totalPages} page={page} />
        </div>
      )}
    </div>
  );
}
