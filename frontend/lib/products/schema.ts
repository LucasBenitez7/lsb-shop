import { z } from "zod";

export const productVariantSchema = z.object({
  id: z.string().optional(),
  size: z.string().min(1, "Falta Talla"),
  color: z.string().min(1, "Falta Color"),
  colorHex: z.string().optional().nullable(),
  colorOrder: z.coerce
    .number()
    .int()
    .min(0, "El orden no puede ser negativo")
    .default(0),
  stock: z.coerce.number().int().min(0, "Mínimo 0"),
  priceCents: z.coerce
    .number()
    .min(0, "El precio no puede ser negativo")
    .optional()
    .nullable(),
});

export const productImageSchema = z.object({
  id: z.string().optional(),
  url: z.string().url().min(1, "URL requerida"),
  alt: z.string().optional().nullable(),
  color: z.string().nullable(),
  sort: z.number().int().default(0),
});

// --- ESQUEMA PRINCIPAL ---
export const productSchema = z
  .object({
    name: z.string().min(3, "Mínimo 3 caracteres"),
    slug: z.string().optional().or(z.literal("")),
    description: z.string().min(3, "La descripción es requerida"),
    priceCents: z.coerce.number().min(1, "El precio es requerido"),
    compareAtPrice: z.coerce
      .number()
      .min(0, "El precio no puede ser negativo")
      .optional()
      .nullable(),
    categoryId: z.string().min(1, "Selecciona una categoría"),
    isArchived: z.boolean().default(false),
    sortOrder: z.preprocess(
      (val) => (val === "" ? null : val),
      z.coerce
        .number()
        .int()
        .min(0, "El orden no puede ser negativo")
        .optional()
        .nullable(),
    ),
    images: z.array(productImageSchema).default([]),
    variants: z
      .array(productVariantSchema)
      .min(1, "Debes añadir al menos una variante"),
  })
  .superRefine((data, ctx) => {
    const activeVariantColors = new Set(
      data.variants.map((v) => v.color).filter(Boolean),
    );

    const variantMap = new Map<string, number[]>();
    const seenImages = new Set<string>();
    const coveredColors = new Set<string>();

    data.variants.forEach((v, idx) => {
      if (!v.color || !v.size) return;

      const uniqueKey = `${v.color.trim().toUpperCase()}-${v.size.trim().toUpperCase()}`;

      if (!variantMap.has(uniqueKey)) variantMap.set(uniqueKey, []);
      variantMap.get(uniqueKey)?.push(idx);
    });

    variantMap.forEach((indices) => {
      if (indices.length > 1) {
        indices.forEach((idx) => {
          ctx.addIssue({
            code: "custom",
            message: "Variante duplicada",
            path: ["variants", idx, "size"],
          });
        });
      }
    });

    // 3. VALIDACIÓN DE IMÁGENES
    data.images.forEach((img, idx) => {
      if (!img.color) {
        ctx.addIssue({
          code: "custom",
          message: "Asigna un color.",
          path: ["images", idx, "color"],
        });
        return;
      }

      if (!activeVariantColors.has(img.color)) {
        ctx.addIssue({
          code: "custom",
          message: `El color "${img.color}" ya no existe en variantes. Elimina esta foto.`,
          path: ["images", idx, "color"],
        });
      } else {
        coveredColors.add(img.color);
      }

      const nameToCheck = img.alt ? img.alt.trim().toLowerCase() : "sin-nombre";
      const colorToCheck = img.color.trim().toLowerCase();
      const uniqueImageKey = `${colorToCheck}-${nameToCheck}`;

      if (seenImages.has(uniqueImageKey)) {
        ctx.addIssue({
          code: "custom",
          message: "Imagen repetida.",
          path: ["images", idx, "url"],
        });
      } else {
        seenImages.add(uniqueImageKey);
      }
    });

    const orderMap = new Map<number, string>();

    data.variants.forEach((v, idx) => {
      if (!v.color || v.colorOrder === undefined || v.colorOrder === 0) return;

      if (orderMap.has(v.colorOrder)) {
        const existingColor = orderMap.get(v.colorOrder);

        if (existingColor !== v.color) {
          ctx.addIssue({
            code: "custom",
            message: `El orden ${v.colorOrder} ya lo usa el color "${existingColor}".`,
            path: ["variants", idx, "colorOrder"],
          });
        }
      } else {
        orderMap.set(v.colorOrder, v.color);
      }
    });

    activeVariantColors.forEach((color) => {
      if (!coveredColors.has(color)) {
        ctx.addIssue({
          code: "custom",
          message: `Faltan imágenes para el color: ${color}`,
          path: ["images"],
        });
      }
    });
  });

export type ProductFormValues = z.infer<typeof productSchema>;
export type VariantItem = z.infer<typeof productVariantSchema>;
export type ImageItem = z.infer<typeof productImageSchema>;
