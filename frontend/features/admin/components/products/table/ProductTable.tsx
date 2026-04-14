"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Image } from "@/components/ui/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { formatCurrency, parseCurrency } from "@/lib/currency";
import { type AdminProductItem } from "@/lib/products/types";
import { cn } from "@/lib/utils";

interface ProductTableProps {
  products: AdminProductItem[];
  grandTotalStock: number;
}

export function ProductTable({ products }: ProductTableProps) {
  const searchParams = useSearchParams();
  const query = searchParams.get("q");

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-foreground">
        <p className="font-semibold text-lg">
          {query
            ? "No se encontraron resultados"
            : "No hay productos disponibles"}
        </p>
        <p className="text-sm mt-1 mb-4 text-muted-foreground">
          {query
            ? `No hay coincidencias para "${query}"`
            : "Comienza añadiendo productos a tu inventario."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <Table>
        <TableHeader className="bg-neutral-50">
          <TableRow>
            <TableHead className="w-[80px] text-center">Orden</TableHead>
            <TableHead>ID</TableHead>
            <TableHead className="w-[80px]">Imagen</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Precio</TableHead>
            <TableHead className="text-center">Stock</TableHead>
            <TableHead className="text-center">Ventas</TableHead>
            <TableHead className="text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            const isArchived = product.isArchived;
            const img = product.images[0]?.url ?? "/og/default-product.jpg";
            const currency = parseCurrency(product.currency);
            const totalStock = product._totalStock;
            const totalSold = product._totalSold ?? 0;
            const isOutOfStock = totalStock === 0;

            return (
              <TableRow key={product.id} className="hover:bg-neutral-50">
                <TableCell className="text-center">
                  {product.sortOrder ? (
                    <span className="font-mono text-xs font-medium">
                      {product.sortOrder}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>

                <TableCell className="text-left">
                  <span className="font-mono text-xs font-medium">
                    {product.id}
                  </span>
                </TableCell>

                {/* 1. IMAGEN */}
                <TableCell className="py-2">
                  <div className="relative h-16 w-12 rounded-xs bg-neutral-100 overflow-hidden">
                    <Image
                      src={img}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="60px"
                    />
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{product.name}</span>

                      {isArchived && (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-1 text-[10px] mt-0.5 font-medium text-amber-700 border border-amber-200">
                          Archivado
                        </span>
                      )}

                      {isOutOfStock && !isArchived && (
                        <span className="inline-flex items-center rounded-full bg-red-50 px-1 text-[10px] mt-0.5 font-medium text-red-700 border border-red-200">
                          Agotado
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>

                <TableCell className="text-sm font-medium">
                  {product.category.name}
                </TableCell>

                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    {product.compareAtPrice &&
                    product.compareAtPrice > product.priceCents ? (
                      <>
                        <span className="text-xs text-muted-foreground line-through">
                          {formatCurrency(product.compareAtPrice, currency)}
                        </span>
                        <span className="text-red-600 text-sm">
                          {formatCurrency(product.priceCents, currency)}
                        </span>
                      </>
                    ) : (
                      formatCurrency(product.priceCents, currency)
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-center">
                  <Badge
                    variant={"outline"}
                    className={cn(
                      "w-7 h-6 flex items-center mx-auto font-semibold justify-center text-xs border",
                      isOutOfStock
                        ? "bg-red-50 text-red-500 border-red-200"
                        : "bg-green-50 text-green-700 border-green-200",
                    )}
                  >
                    {totalStock}
                  </Badge>
                </TableCell>

                <TableCell className="text-center">
                  <span className="font-mono text-xs font-medium text-foreground">
                    {totalSold}
                  </span>
                </TableCell>

                <TableCell className="text-center">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="fx-underline-anim font-medium text-sm"
                  >
                    Editar
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
