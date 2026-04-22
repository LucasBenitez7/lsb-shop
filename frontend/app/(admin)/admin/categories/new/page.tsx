import Link from "next/link";
import { redirect } from "next/navigation";
import { FaArrowLeft } from "react-icons/fa6";

import { canWriteAdmin } from "@/lib/roles";
import { auth } from "@/lib/api/auth/server";
import { getCategoryOrderList } from "@/lib/api/categories";

import { CategoryForm } from "@/features/admin/components/categories/CategoryForm";

export default async function NewCategoryPage() {
  const session = await auth();
  if (!canWriteAdmin(session?.user?.role)) {
    redirect("/admin/categories");
  }

  const orderList = await getCategoryOrderList();

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-2">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b gap-2 pb-2">
        <div className="flex justify-start">
          <Link
            href="/admin/categories"
            className="hover:bg-neutral-100 p-2 rounded-xs transition-colors"
          >
            <FaArrowLeft className="size-4" />
          </Link>
        </div>

        <div className="flex justify-center">
          <h1 className="text-2xl font-semibold tracking-tight flex-1 text-center">
            Nueva Categoría
          </h1>
        </div>

        <div />
      </div>
      <CategoryForm existingCategories={orderList.map((item) => ({
        id: item.id,
        name: item.name,
        sort: item.sortOrder,
      }))} readOnly={false} />
    </div>
  );
}
