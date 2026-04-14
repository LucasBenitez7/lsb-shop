import Link from "next/link";
import { FaPlus } from "react-icons/fa6";

import { PaginationNav } from "@/features/catalog/components/PaginationNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

import { canWriteAdmin } from "@/lib/roles";
import { auth } from "@/lib/auth/server";
import { getAdminProducts, getMaxPrice } from "@/lib/api/products";
import { cn } from "@/lib/utils";

import { ProductListToolbar } from "@/features/admin/components/products/table/ProductListToolbar";
import { ProductTable } from "@/features/admin/components/products/table/ProductTable";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    sort?: string;
    categories?: string;
    status?: string;
    min?: string;
    max?: string;
    q?: string;
    page?: string;
    on_sale?: string;
    stock?: string;
  }>;
};

const tabs = [
  { label: "Activos", value: undefined },
  { label: "Archivados / Papelera", value: "archived" },
];

export default async function AdminProductsPage({ searchParams }: Props) {
  const [sp, session] = await Promise.all([searchParams, auth()]);
  const canWrite = canWriteAdmin(session?.user?.role);

  const page = Number(sp.page) || 1;
  const query = sp.q?.trim();
  const categories = sp.categories?.split(",").filter(Boolean);
  const status = sp.status;

  // Helpers de precio
  const parseCents = (val?: string) =>
    val && !isNaN(parseFloat(val))
      ? Math.round(parseFloat(val) * 100)
      : undefined;

  const minCents = parseCents(sp.min);
  const maxCents = parseCents(sp.max);
  const onSale = sp.on_sale === "true";
  const outOfStock = sp.stock === "out";

  // Queries
  const [productsData, globalMaxPrice] = await Promise.all([
    getAdminProducts({
      page,
      query,
      sort: sp.sort,
      categories,
      status,
      minPrice: minCents,
      maxPrice: maxCents,
      onSale,
      outOfStock,
    }),
    getMaxPrice(),
  ]);

  const { products, totalCount, totalPages, allCategories, grandTotalStock } =
    productsData;

  const isArchivedView = status === "archived";

  return (
    <div className="space-y-4">
      <div className="flex sm:flex-row sm:items-center justify-between gap-4 border-b pb-2">
        <h1 className="text-2xl lg:text-3xl font-semibold">Productos</h1>

        {canWrite && (
          <Link
            href="/admin/products/new"
            className="flex items-center font-medium gap-2 bg-foreground text-background py-2 px-3 rounded-xs text-sm hover:bg-foreground/80 transition-colors"
          >
            <FaPlus className="size-4" /> Añadir producto
          </Link>
        )}
      </div>

      {/* TABS DE FILTRO RÁPIDO */}
      <div className="flex gap-6 text-sm">
        {tabs.map((tab) => {
          const isActive = sp.status === tab.value;
          return (
            <Link
              key={tab.label}
              href={
                tab.value
                  ? `/admin/products?status=${tab.value}`
                  : "/admin/products"
              }
              className={cn(
                "pb-0.5 border-b-2 font-semibold transition-colors",
                isActive
                  ? "border-foreground"
                  : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 actve:text-neutral-700 actve:border-neutral-300",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader className="p-4 border-b flex flex-col md:flex-row md:items-center items-start justify-between gap-2 md:gap-5">
          <CardTitle className="flex items-center gap-1 text-lg font-semibold w-fit">
            {isArchivedView ? "Papelera" : "Total"}{" "}
            <span className="text-base">({totalCount})</span>
          </CardTitle>

          <div className="w-full">
            <ProductListToolbar
              categories={allCategories}
              globalMaxPrice={globalMaxPrice}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ProductTable products={products} grandTotalStock={grandTotalStock} />

          {totalPages > 1 && (
            <div className="py-4 flex justify-end px-4 border-t">
              <PaginationNav totalPages={totalPages} page={page} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
