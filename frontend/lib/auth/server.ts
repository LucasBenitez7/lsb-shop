import { cookies } from "next/headers";
import { cache } from "react";

import type { User } from "@/types/user";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Server-only session for RSC / layouts. Uses JWT cookies set by Django (dj-rest-auth).
 * Token refresh on navigation is handled in middleware; this read stays a single /users/me/ fetch.
 */
export const auth = cache(async (): Promise<{ user: User } | null> => {
  const cookieStore = await cookies();
  const parts = cookieStore.getAll();
  if (parts.length === 0) return null;

  const cookieHeader = parts.map((c) => `${c.name}=${c.value}`).join("; ");

  const res = await fetch(`${API_URL}/api/v1/users/me/`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });

  if (!res.ok) return null;

  const user = (await res.json()) as User;
  return { user };
});
