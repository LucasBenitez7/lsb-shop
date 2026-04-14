import type { StoreConfigFormValues } from "@/lib/admin/settings-schema";
import type { StoreConfig } from "@/types/store";

const emptyFormValues = (): StoreConfigFormValues => ({
  heroImage: null,
  heroMobileImage: null,
  heroTitle: "",
  heroSubtitle: "",
  heroLink: "",
  saleImage: null,
  saleMobileImage: null,
  saleTitle: "",
  saleSubtitle: "",
  saleLink: "",
  saleBackgroundColor: "",
});

/**
 * Maps API / `StoreConfig` fields to react-hook-form values (`settings-schema`).
 */
export function storeConfigToFormValues(
  data: StoreConfig | null,
): StoreConfigFormValues {
  if (!data) return emptyFormValues();

  return {
    heroImage: data.heroImageUrl,
    heroMobileImage: data.heroImageUrlMobile,
    heroTitle: data.heroTitle ?? "",
    heroSubtitle: data.heroSubtitle ?? "",
    heroLink: data.heroCta ?? "",
    saleImage: data.saleImageUrl,
    saleMobileImage: data.saleImageUrlMobile,
    saleTitle: data.saleTitle ?? "",
    saleSubtitle: data.saleSubtitle ?? "",
    saleLink: data.saleLink ?? "",
    saleBackgroundColor: data.saleBackgroundColor ?? "",
  };
}
