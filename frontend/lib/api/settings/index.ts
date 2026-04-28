import { APIError, apiPatch, formatAPIErrorBody } from "@/lib/api/client";

import type { StoreConfigFormValues } from "@/lib/admin/settings-schema";
import type { StoreConfig } from "@/types/store";


/** Django `StoreSettingsSerializer` JSON (snake_case). */
export interface DrfStoreSettings {
  id: number;
  hero_image: string;
  hero_mobile_image: string;
  hero_title: string;
  hero_subtitle: string;
  hero_link: string;
  sale_image: string;
  sale_mobile_image: string;
  sale_title: string;
  sale_subtitle: string;
  sale_link: string;
  sale_background_color: string;
  created_at: string;
  updated_at: string;
}

export function mapDrfToStoreConfig(d: DrfStoreSettings): StoreConfig {
  return {
    id: String(d.id),
    storeName: null,
    logoUrl: null,
    heroTitle: d.hero_title || null,
    heroSubtitle: d.hero_subtitle || null,
    heroCta: d.hero_link || null,
    heroImageUrl: d.hero_image || null,
    heroImageUrlMobile: d.hero_mobile_image || null,
    saleTitle: d.sale_title || null,
    saleSubtitle: d.sale_subtitle || null,
    saleCta: null,
    saleImageUrl: d.sale_image || null,
    saleImageUrlMobile: d.sale_mobile_image || null,
    saleLink: d.sale_link || null,
    saleBackgroundColor: d.sale_background_color || null,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}

function storeFormValuesToPatchBody(
  data: StoreConfigFormValues,
): Record<string, unknown> {
  return {
    hero_image: data.heroImage ?? "",
    hero_mobile_image: data.heroMobileImage ?? "",
    hero_title: data.heroTitle,
    hero_subtitle: data.heroSubtitle ?? "",
    hero_link: data.heroLink ?? "",
    sale_image: data.saleImage ?? "",
    sale_mobile_image: data.saleMobileImage ?? "",
    sale_title: data.saleTitle,
    sale_subtitle: data.saleSubtitle ?? "",
    sale_link: data.saleLink ?? "",
    sale_background_color: data.saleBackgroundColor ?? "",
  };
}

/**
 * Persists store presentation settings (hero, sale banner) via PATCH
 * `/api/v1/store-settings/`. Requires staff session (admin editor).
 */
export async function updateStoreConfig(
  data: StoreConfigFormValues,
): Promise<{ error: string | null }> {
  try {
    await apiPatch<DrfStoreSettings>(
      "/api/v1/store-settings/",
      storeFormValuesToPatchBody(data),
    );
    return { error: null };
  } catch (e) {
    if (e instanceof APIError) {
      const body =
        e.detail && typeof e.detail === "object" && !Array.isArray(e.detail)
          ? formatAPIErrorBody(e.detail as Record<string, unknown>)
          : null;
      return { error: body ?? e.message };
    }
    return {
      error: e instanceof Error ? e.message : "Something went wrong.",
    };
  }
}
