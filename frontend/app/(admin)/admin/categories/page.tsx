import Link from "next/link";
import { FaPlus } from "react-icons/fa6";

import { CategoryListToolbar } from "@/features/admin/components/categories/CategoryListToolbar";
import { CategoryTable } from "@/features/admin/components/categories/CategoryTable";
import { PaginationNav } from "@/features/catalog/components/PaginationNav";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { auth } from "@/lib/api/auth/server";
import { getAdminCategories } from "@/lib/api/categories/server";
import { canWriteAdmin } from "@/lib/roles";


export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    filter?: "all" | "with_products" | "empty";
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    q?: string;
    page?: string;
  }>;
}

export default async function AdminCategoriesPage({ searchParams }: Props) {
  const [sp, session] = await Promise.all([searchParams, auth()]);
  const canWrite = canWriteAdmin(session?.user?.role);

  const page = Number(sp.page) || 1;

  const { items: categories, total: totalCount } = await getAdminCategories({
    page,
    query: sp.q,
    filter: sp.filter,
    sortBy: sp.sortBy,
    sortOrder: sp.sortOrder,
  });
  const pageSize = 100;
  const totalPages =
    totalCount === 0 ? 0 : Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-2">
        <h1 className="text-2xl lg:text-3xl font-semibold">Categorías</h1>
        {canWrite && (
          <Link
            href="/admin/categories/new"
            className="flex items-center font-medium gap-2 bg-foreground text-white hover:bg-foreground/80 transition-colors py-2 px-3 rounded-xs text-sm"
          >
            <FaPlus className="size-4" /> Añadir Categoría
          </Link>
        )}
      </div>

      <Card>
        <CardHeader className="p-4 border-b flex flex-col md:flex-row md:items-center items-start justify-between gap-2 md:gap-5">
          <CardTitle className="flex items-center gap-1 text-lg font-semibold w-fit">
            Total <span className="text-base">({totalCount})</span>
          </CardTitle>

          <div className="w-full">
            <CategoryListToolbar />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <CategoryTable categories={categories} />

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
