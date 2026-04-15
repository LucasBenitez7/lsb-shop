import Link from "next/link";
import { notFound } from "next/navigation";
import { FaArrowLeft } from "react-icons/fa6";

import { canWriteAdmin } from "@/lib/roles";
import { auth } from "@/lib/auth/server";
import {
  getCategoryById,
  getCategoryOrderList,
} from "@/lib/api/categories";

import { CategoryForm } from "@/features/admin/components/categories/CategoryForm";
import { DeleteCategoryButton } from "@/features/admin/components/categories/DeleteCategoryButton";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditCategoryPage({ params }: Props) {
  const { id } = await params;

  const [category, orderList, session] = await Promise.all([
    getCategoryById(id),
    getCategoryOrderList(),
    auth(),
  ]);

  if (!category) {
    notFound();
  }

  const hasProducts = category._count.products > 0;
  const canWrite = canWriteAdmin(session?.user?.role);

  const categoryForForm = {
    id: category.id,
    name: category.name,
    slug: category.slug,
    sort: category.sortOrder,
    isFeatured: category.isFeatured,
    image: category.imageUrl,
    mobileImage: category.mobileImageUrl ?? null,
  };

  const categoriesForPreview = orderList.map((c) => ({
    id: c.id,
    name: c.name,
    sort: c.sortOrder,
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-2">
      <div className="flex items-center justify-between border-b pb-2">
        <Link
          href="/admin/categories"
          className="hover:bg-neutral-100 p-2 rounded-xs transition-colors"
        >
          <FaArrowLeft className="size-4" />
        </Link>

        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {category.name}
          </h1>
        </div>

        {canWrite && (
          <DeleteCategoryButton id={category.id} hasProducts={hasProducts} />
        )}
      </div>

      <CategoryForm
        category={categoryForForm}
        existingCategories={categoriesForPreview}
        readOnly={!canWrite}
      />
    </div>
  );
}
