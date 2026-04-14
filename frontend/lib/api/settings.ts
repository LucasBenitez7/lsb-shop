import type { StoreConfigFormValues } from "@/lib/admin/settings-schema";
import type { StoreConfig } from "@/types/store";

/**
 * Loads public / admin store configuration.
 * TODO: apiFetch<StoreConfig>("/api/v1/settings/store/") or admin endpoint.
 */
export async function getStoreConfig(): Promise<StoreConfig | null> {
  return null;
}

/**
 * Persists store presentation settings (hero, sale banner).
 * TODO: apiFetch PATCH admin store config when backend exists.
 */
export async function updateStoreConfig(
  _data: StoreConfigFormValues,
): Promise<{ error: string | null }> {
  return { error: null };
}
