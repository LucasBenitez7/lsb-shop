"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { upsertProductAction } from "@/app/(admin)/admin/products/_action/actions";

import type { ProductFormValues } from "@/lib/products/schema";

export function useProductSubmit(productId?: string) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onSubmit = (data: ProductFormValues) => {
    startTransition(async () => {
      const formData = new FormData();
      if (productId) formData.append("id", productId);

      formData.append("name", data.name);
      formData.append("description", data.description || "");
      formData.append("priceCents", String(data.priceCents));
      if (data.compareAtPrice) {
        formData.append("compareAtPrice", String(data.compareAtPrice));
      }
      formData.append("categoryId", data.categoryId);
      formData.append("isArchived", String(data.isArchived));
      if (data.slug) formData.append("slug", data.slug);
      formData.append("sortOrder", String(data.sortOrder ?? ""));

      formData.append("imagesJson", JSON.stringify(data.images));
      formData.append("variantsJson", JSON.stringify(data.variants));

      const result = await upsertProductAction({}, formData);

      if (result?.errors) toast.error("Revisa los errores del formulario.");
      else if (result?.message) toast.error(result.message);
      else {
        toast.success("Producto guardado correctamente.");
        router.refresh();
      }
    });
  };

  return { isPending, onSubmit };
}
