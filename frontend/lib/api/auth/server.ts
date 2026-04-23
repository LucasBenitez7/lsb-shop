/**
 * Server-only auth helper for RSC / layouts.
 * Uses `serverFetchJson` to forward cookies and check authentication.
 */
import { cache } from "react";
import { serverFetchJson } from "@/lib/api/server-django";
import type { User } from "@/types/user";

/**
 * Returns the current authenticated user or null.
 * Uses React cache() to dedupe calls within a single request.
 *
 * Call from Server Components, layouts, or route handlers.
 * Never call from Client Components.
 */
export const auth = cache(async (): Promise<{ user: User } | null> => {
  try {
    const user = await serverFetchJson<User>("/api/v1/users/me/");
    return { user };
  } catch {
    // 401 or network error → no session
    return null;
  }
});
