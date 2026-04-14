const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ─── Error ────────────────────────────────────────────────────────────────────

export class APIError extends Error {
  constructor(
    public readonly message: string,
    public readonly status: number,
    public readonly detail?: unknown,
  ) {
    super(message);
    this.name = "APIError";
  }
}

function firstStringFromList(value: unknown): string | null {
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") {
    return value[0];
  }
  return null;
}

/** Best-effort message from DRF / dj-rest-auth error payloads. */
export function formatAPIErrorBody(body: Record<string, unknown>): string | null {
  const detail = body.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.every((x) => typeof x === "string")) {
    return detail.join(" ");
  }
  const nonField = firstStringFromList(body.non_field_errors);
  if (nonField) return nonField;
  for (const key of Object.keys(body)) {
    if (key === "detail" || key === "non_field_errors") continue;
    const val = body[key];
    const fromList = firstStringFromList(val);
    if (fromList) return fromList;
    if (typeof val === "string") return val;
  }
  return null;
}

async function toAPIError(res: Response): Promise<APIError> {
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const message =
    formatAPIErrorBody(body) ?? "Something went wrong. Please try again.";
  return new APIError(message, res.status, body);
}

// ─── 401 handling: skip silent refresh on credential / auth-flow endpoints ─────

/**
 * 401 on these paths usually means wrong password, invalid registration, etc. —
 * not an expired session cookie. Matches dj-rest-auth routes under /api/v1/auth/.
 */
const PATH_PREFIXES_NO_SILENT_REFRESH_ON_401: readonly string[] = [
  "/api/v1/auth/login",
  "/api/v1/auth/logout",
  "/api/v1/auth/token/refresh",
  "/api/v1/auth/token/verify",
  "/api/v1/auth/registration",
  "/api/v1/auth/password/reset",
  "/api/v1/auth/password/change",
  "/api/v1/auth/google",
];

function shouldSilentRefreshOn401(path: string): boolean {
  const pathname = path.split("?")[0];
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return !PATH_PREFIXES_NO_SILENT_REFRESH_ON_401.some((prefix) => {
    const p = prefix.replace(/\/+$/, "") || "/";
    return normalized === p || normalized.startsWith(`${p}/`);
  });
}

// ─── Headers ──────────────────────────────────────────────────────────────────

function buildRequestHeaders(options: RequestInit): Headers {
  const headers = new Headers(options.headers);
  if (options.body instanceof FormData) {
    headers.delete("Content-Type");
    return headers;
  }
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}

// ─── Core fetch ───────────────────────────────────────────────────────────────

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: "include", 
    headers: buildRequestHeaders(options),
  });

  if (res.status === 401 && !shouldSilentRefreshOn401(path)) {
    throw await toAPIError(res);
  }

  // Token expired — attempt silent refresh once
  if (res.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshToken().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }

    try {
      await refreshPromise;
      // Retry original request after refresh
      const retryRes = await fetch(`${BASE_URL}${path}`, {
        ...options,
        credentials: "include",
        headers: buildRequestHeaders(options),
      });

      if (!retryRes.ok) {
        throw new APIError("Session expired. Please log in again.", 401);
      }

      if (retryRes.status === 204) return undefined as T;

      return retryRes.json() as Promise<T>;
    } catch {
      throw new APIError("Session expired. Please log in again.", 401);
    }
  }

  if (!res.ok) {
    throw await toAPIError(res);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ─── Token refresh ────────────────────────────────────────────────────────────

async function refreshToken(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/token/refresh/`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new APIError("Session expired. Please log in again.", 401);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function apiGet<T>(path: string, options?: RequestInit): Promise<T> {
  return apiFetch<T>(path, { ...options, method: "GET" });
}

export function apiPost<T>(
  path: string,
  body: unknown,
  options?: RequestInit,
): Promise<T> {
  return apiFetch<T>(path, {
    ...options,
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function apiPatch<T>(
  path: string,
  body: unknown,
  options?: RequestInit,
): Promise<T> {
  return apiFetch<T>(path, {
    ...options,
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function apiDelete<T = void>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  return apiFetch<T>(path, { ...options, method: "DELETE" });
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
