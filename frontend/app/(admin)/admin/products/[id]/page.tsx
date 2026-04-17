import Link from "next/link";
import { notFound } from "next/navigation";
import { FaUndo } from "react-icons/fa";
import {
  FaArrowUpRightFromSquare,
  FaArrowLeft,
  FaBoxOpen,
  FaCartShopping,
  FaLayerGroup,
} from "react-icons/fa6";

import { canWriteAdmin } from "@/lib/roles";
import { auth } from "@/lib/auth/server";
import {
  getAdminProductById,
  getProductFormDependencies,
  getProductSalesAndReturns,
} from "@/lib/api/products/admin";

import { StatCard } from "@/features/admin/components/products/shared/StatCard";

import { ProductForm } from "@/features/admin/components/products/form/ProductForm";
import { ArchiveButton } from "@/features/admin/components/products/shared/ArchiveButton";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, formDeps, salesStats, session] = await Promise.all([
    getAdminProductById(id),
    getProductFormDependencies(),
    getProductSalesAndReturns(id),
    auth(),
  ]);
  if (!product) notFound();

  const canWrite = canWriteAdmin(session?.user?.role);

  const totalStock = product._totalStock;
  const totalVariants = product.variants.length;
  const totalSales = salesStats.totalSold;
  const totalReturns = salesStats.totalReturned;

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-10">
      <div className="flex items-center justify-between gap-4 border-b pb-2">
        <Link
          href="/admin/products"
          className="hover:bg-neutral-100 p-2 rounded-xs transition-colors"
        >
          <FaArrowLeft className="size-4" />
        </Link>

        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            {product.name.slice(0, 30)}

            {product.isArchived && (
              <span className="bg-amber-100 px-2 py-0.5 rounded-md text-xs font-medium text-amber-700 border border-amber-200">
                Archivado
              </span>
            )}
          </h1>
        </div>

        {canWrite && product.isArchived ? (
          <ArchiveButton
            productId={id}
            productName={product.name}
            productSlug={product.slug}
            isArchived={product.isArchived}
          />
        ) : !product.isArchived ? (
          <Link
            href={`/product/${product.slug}`}
            target="_blank"
            className="text-xs fx-underline-anim font-medium w-fit mt-2"
          >
            Ver en Tienda
            <span>
              <FaArrowUpRightFromSquare className="size-3.5 inline-block mb-1 ml-2" />
            </span>
          </Link>
        ) : null}
      </div>

      {/* --- STATS --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ">
        <StatCard
          label="Stock Total"
          value={`${totalStock} u.`}
          icon={FaBoxOpen}
          subtext={totalStock === 0 ? "Agotado" : "En inventario"}
          trend={totalStock < 5 ? "low" : "normal"}
        />
        <StatCard
          label="Variantes"
          value={totalVariants}
          icon={FaLayerGroup}
          subtext="Colores y tallas"
        />
        <StatCard
          label="Ventas"
          value={totalSales}
          icon={FaCartShopping}
          subtext="Histórico total"
          trend={totalSales > 0 ? "good" : "normal"}
        />
        <StatCard
          label="Reembolsos"
          value={totalReturns}
          icon={FaUndo}
          subtext="Histórico total"
          trend={totalSales > 0 ? "low" : "normal"}
        />
      </div>

      {/* --- FORMULARIO --- */}
      <ProductForm product={product} {...formDeps} readOnly={!canWrite} />
    </div>
  );
}
