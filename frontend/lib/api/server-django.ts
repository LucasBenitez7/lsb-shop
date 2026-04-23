import { cookies } from "next/headers";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Cookie header for server-side `fetch` to Django (same cookies `auth()` uses in `lib/api/auth/server.ts`).
 * Only call from Server Components, route handlers, or server actions.
 */
export async function buildServerCookieHeader(): Promise<string | null> {
  const cookieStore = await cookies();
  const parts = cookieStore.getAll();
  if (parts.length === 0) return null;
  return parts.map((c) => `${c.name}=${c.value}`).join("; ");
}

/**
 * GET JSON from the Django API on the server, forwarding the browser session cookie.
 */
export async function serverFetchJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const cookieHeader = await buildServerCookieHeader();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    method: init?.method ?? "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/** POST/PATCH/PUT JSON with session cookies (Server Components / Server Actions only). */
export async function serverMutationJson<T>(
  path: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown,
  init?: RequestInit,
): Promise<T> {
  const cookieHeader = await buildServerCookieHeader();
  const hasJsonBody = body !== undefined && method !== "DELETE";
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    method,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...init?.headers,
    },
    body: hasJsonBody ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText || String(res.status));
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}
