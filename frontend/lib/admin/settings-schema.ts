import { z } from "zod";

export const storeConfigSchema = z.object({
  heroImage: z.string().optional().nullable(),
  heroMobileImage: z.string().optional().nullable(),
  heroTitle: z.string().min(1, "El título es requerido").optional(),
  heroSubtitle: z.string().optional(),
  heroLink: z.string().optional(),

  saleImage: z.string().optional().nullable(),
  saleMobileImage: z.string().optional().nullable(),
  saleTitle: z.string().min(1, "El título es requerido").optional(),
  saleSubtitle: z.string().optional(),
  saleLink: z.string().optional(),
  saleBackgroundColor: z.string().optional(),
});

export type StoreConfigFormValues = z.infer<typeof storeConfigSchema>;
