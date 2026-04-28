import { buildServerCookieHeader } from "@/lib/api/server-django";
import { mapDrfToStoreConfig, type DrfStoreSettings } from "@/lib/api/settings";

import type { StoreConfig } from "@/types/store";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Loads singleton store settings (hero + sale) for Server Components.
 * Uses forwarded session cookies. Returns `null` if the API is unreachable or
 * the user is not allowed (e.g. anonymous — public home falls back to defaults).
 */
export async function getStoreConfig(): Promise<StoreConfig | null> {
  const cookieHeader = await buildServerCookieHeader();
  const res = await fetch(`${BASE_URL}/api/v1/store-settings/`, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
  });
  if (!res.ok) {
    return null;
  }
  const raw = (await res.json()) as DrfStoreSettings;
  return mapDrfToStoreConfig(raw);
}
