"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";


import { upsertProductAction } from "@/lib/api/products/mutations";

import type { ProductFormValues } from "@/lib/products/schema";
import type { UseFormSetError } from "react-hook-form";

// Maps Django field names to React Hook Form field names.
const FIELD_MAP: Partial<Record<string, keyof ProductFormValues>> = {
  compare_at_price: "compareAtPrice",
  name: "name",
  description: "description",
  category: "categoryId",
};

export function useProductSubmit(
  productId?: string,
  productSlug?: string,
  setError?: UseFormSetError<ProductFormValues>,
) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onSubmit = (data: ProductFormValues) => {
    // Final price guard: compareAtPrice (the crossed-out base) must be greater
    // than priceCents (the real sale price). Zod may not catch it if setValue
    // runs asynchronously right before submit.
    if (
      data.compareAtPrice != null &&
      data.compareAtPrice > 0 &&
      data.compareAtPrice <= data.priceCents
    ) {
      if (setError) {
        setError("compareAtPrice", {
          type: "manual",
          message: "El precio base debe ser mayor que el precio de oferta.",
        });
      }
      toast.error("El precio base debe ser mayor que el precio de oferta.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      if (productId) formData.append("id", productId);
      if (productSlug) formData.append("originalSlug", productSlug);

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

      if (result?.errors) {
        let hasKnownField = false;

        for (const [djangoField, messages] of Object.entries(result.errors)) {
          const rhfField = FIELD_MAP[djangoField];
          if (rhfField && setError) {
            setError(rhfField, { type: "server", message: messages[0] });
            hasKnownField = true;
          }
        }

        const unknownMessages = Object.entries(result.errors)
          .filter(([key]) => !FIELD_MAP[key])
          .flatMap(([, msgs]) => msgs);

        if (unknownMessages.length > 0) {
          toast.error(unknownMessages[0]);
        } else if (!hasKnownField) {
          toast.error("Revisa los errores del formulario.");
        } else {
          toast.error("No se ha podido guardar. Revisa los campos marcados.");
        }
      } else if (result?.message) {
        toast.error(result.message);
      } else {
        toast.success("Producto guardado correctamente.");
        router.push("/admin/products");
      }
    });
  };

  return { isPending, onSubmit };
}
