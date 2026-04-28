import { NextResponse } from "next/server";

import { canAccessAdmin } from "@/lib/roles";

import type { UserRole } from "@/types/user";
import type { NextRequest} from "next/server";

// ─── Route config ─────────────────────────────────────────────────────────────

const PUBLIC_ROUTES = [
  "/",
  "/catalogo",
  "/rebajas",
  "/search",
  "/contacto",
  "/sobre-nosotros",
  "/privacidad",
  "/terminos",
  "/novedades",
];

/** Guest-friendly shop flows (explicit — not only “fall-through”). */
function isShopPublicPath(pathname: string): boolean {
  if (pathname === "/cart" || pathname.startsWith("/cart/")) return true;
  if (pathname === "/checkout" || pathname.startsWith("/checkout/"))
    return true;
  return false;
}

const AUTH_ROUTES = [
  "/auth/login",
  "/auth/register",
  "/forgot-password",
  "/reset-password",
];

const USER_ROUTES = ["/account"];
const ADMIN_ROUTES = ["/admin"];

/** Same query name as login page and server redirects (`/auth/login?redirectTo=…`). */
const LOGIN_REDIRECT_PARAM = "redirectTo";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isPublic(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  if (isShopPublicPath(pathname)) return true;
  // Dynamic public routes
  if (pathname.startsWith("/product/")) return true;
  if (pathname.startsWith("/cat/")) return true;
  if (pathname.startsWith("/tracking")) return true;
  return false;
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((r) => pathname.startsWith(r));
}

function isUserRoute(pathname: string): boolean {
  return USER_ROUTES.some((r) => pathname.startsWith(r));
}

function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some((r) => pathname.startsWith(r));
}

// ─── Cookie forwarding (refresh → browser) ────────────────────────────────────

function getSetCookieValues(res: Response): string[] {
  const headers = res.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }
  const single = res.headers.get("set-cookie");
  return single ? [single] : [];
}

function parseCookieHeader(cookieHeader: string): Map<string, string> {
  const jar = new Map<string, string>();
  if (!cookieHeader.trim()) return jar;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const name = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (name) jar.set(name, value);
  }
  return jar;
}

function applySetCookieLines(
  jar: Map<string, string>,
  setCookieLines: string[],
): void {
  for (const line of setCookieLines) {
    const pair = line.split(";")[0]?.trim();
    if (!pair) continue;
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (name) jar.set(name, value);
  }
}

function buildCookieHeader(jar: Map<string, string>): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function withForwardedSetCookies(
  response: NextResponse,
  setCookieLines: string[],
): NextResponse {
  for (const line of setCookieLines) {
    response.headers.append("Set-Cookie", line);
  }
  return response;
}

// ─── Session check ────────────────────────────────────────────────────────────

interface SessionUser {
  role: UserRole;
}

interface SessionResult {
  user: SessionUser | null;
  /** Raw Set-Cookie lines from token refresh — must be sent to the browser. */
  refreshSetCookies: string[];
}

async function fetchAuthUser(
  apiUrl: string,
  cookieHeader: string,
): Promise<Response> {
  return fetch(`${apiUrl}/api/v1/users/me/`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });
}

async function fetchTokenRefresh(
  apiUrl: string,
  cookieHeader: string,
): Promise<Response> {
  return fetch(`${apiUrl}/api/v1/auth/token/refresh/`, {
    method: "POST",
    headers: {
      cookie: cookieHeader,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
}

async function getSession(request: NextRequest): Promise<SessionResult> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const initialCookie = request.headers.get("cookie") ?? "";

  try {
    let res = await fetchAuthUser(apiUrl, initialCookie);

    if (res.status === 401) {
      const refreshRes = await fetchTokenRefresh(apiUrl, initialCookie);
      if (!refreshRes.ok) {
        return { user: null, refreshSetCookies: [] };
      }

      const refreshSetCookies = getSetCookieValues(refreshRes);
      const jar = parseCookieHeader(initialCookie);
      applySetCookieLines(jar, refreshSetCookies);
      const merged = buildCookieHeader(jar);

      res = await fetchAuthUser(apiUrl, merged);
      if (!res.ok) {
        return { user: null, refreshSetCookies };
      }

      const user = (await res.json()) as SessionUser;
      return { user, refreshSetCookies };
    }

    if (!res.ok) {
      return { user: null, refreshSetCookies: [] };
    }

    const user = (await res.json()) as SessionUser;
    return { user, refreshSetCookies: [] };
  } catch {
    return { user: null, refreshSetCookies: [] };
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Always allow public routes
  if (isPublic(pathname)) return NextResponse.next();

  // Auth routes — redirect to account if already logged in
  if (isAuthRoute(pathname)) {
    const { user: session, refreshSetCookies } = await getSession(request);
    if (session) {
      const res = NextResponse.redirect(new URL("/account", request.url));
      return withForwardedSetCookies(res, refreshSetCookies);
    }
    return NextResponse.next();
  }

  // Protected routes — require session
  if (isUserRoute(pathname) || isAdminRoute(pathname)) {
    const { user: session, refreshSetCookies } = await getSession(request);

    if (!session) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set(LOGIN_REDIRECT_PARAM, pathname);
      const res = NextResponse.redirect(loginUrl);
      return withForwardedSetCookies(res, refreshSetCookies);
    }

    // Admin routes — same rule as (admin)/layout.tsx (admin + demo roles)
    if (isAdminRoute(pathname) && !canAccessAdmin(session.role)) {
      const res = NextResponse.redirect(new URL("/", request.url));
      return withForwardedSetCookies(res, refreshSetCookies);
    }

    const res = NextResponse.next();
    return withForwardedSetCookies(res, refreshSetCookies);
  }

  return NextResponse.next();
}

// ─── Matcher ──────────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - api/ (API routes)
     * - public files with extension (images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\..*).*)",
  ],
};
