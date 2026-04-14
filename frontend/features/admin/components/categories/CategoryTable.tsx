"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { cn } from "@/lib/utils";

import type { AdminCategoryItem } from "@/types/category";

export function CategoryTable({
  categories,
}: {
  categories: AdminCategoryItem[];
}) {
  const searchParams = useSearchParams();
  const query = searchParams.get("q");

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-foreground">
        <p className="font-semibold text-lg">
          {query ? "No se encontraron categorías" : "No hay categorías creadas"}
        </p>
        <p className="text-sm mt-1 mb-4 text-muted-foreground">
          {query
            ? `No hay coincidencias para "${query}"`
            : "Crea categorías para organizar tus productos."}
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
            <TableHead className="text-center">Destacada</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Creado</TableHead>
            <TableHead className="text-center">Productos</TableHead>
            <TableHead className="text-right pr-4">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((cat) => (
            <TableRow key={cat.id} className="hover:bg-neutral-50">
              {/* 1. ORDEN */}
              <TableCell className="text-center font-mono text-xs font-medium py-4">
                {cat.sortOrder}
              </TableCell>

              {/* 2. DESTACADA */}
              <TableCell className="text-center py-3">
                {cat.isFeatured ? (
                  <Badge
                    variant="secondary"
                    className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200 gap-1.5"
                  >
                    Destacada
                  </Badge>
                ) : (
                  <span></span>
                )}
              </TableCell>

              <TableCell className="py-3">
                <div className="flex flex-col">
                  <span className="font-medium">{cat.name}</span>
                </div>
              </TableCell>

              {/* 3. FECHA */}
              <TableCell className="text-xs py-3 font-medium">
                {new Date(cat.createdAt).toLocaleDateString()}
              </TableCell>

              {/* 4. PRODUCTOS (Badge) */}
              <TableCell className="text-center py-3">
                <Badge
                  variant={"outline"}
                  className={cn(
                    "w-7 h-6 flex items-center mx-auto font-semibold justify-center text-xs border",
                    cat._count.products > 0
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-red-50 text-red-500 border-red-200",
                  )}
                >
                  {cat._count.products}
                </Badge>
              </TableCell>

              {/* 5. ACCIONES */}
              <TableCell className="text-right pr-3 py-3">
                <button className="fx-underline-anim mx-3 font-medium">
                  <Link href={`/admin/categories/${cat.id}`}>Editar</Link>
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
