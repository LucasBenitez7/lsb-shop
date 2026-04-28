"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/features/auth/components/AuthProvider";

import {
  isCheckoutAuthLightRoute,
  isCheckoutSuccessRoute,
} from "@/lib/checkout/stripe-return-paths";

/**
 * After `api-session-expired`, redirect to login only on these routes.
 * Note: `/checkout/success` is NOT protected — it shares the `/checkout` prefix
 * but must remain reachable for guests with stale JWT cookies.
 */
function shouldRedirectToLoginAfterSessionExpired(
  pathname: string,
  search: URLSearchParams,
): boolean {
  if (isCheckoutSuccessRoute(pathname)) return false;
  if (isCheckoutAuthLightRoute(pathname, search)) return false;
  if (pathname.startsWith("/account")) return true;
  if (pathname.startsWith("/admin")) return true;
  if (pathname === "/checkout" || pathname.startsWith("/checkout/")) return true;
  return false;
}

/**
 * Listens for `api-session-expired` events emitted by `apiFetch` when both
 * the access token and the refresh token are expired.
 *
 * When fired it:
 *  1. Clears the auth state immediately (user → null, status → unauthenticated)
 *     so the Header dropdown disappears right away.
 *  2. If the user is on a protected page (account, admin, checkout except success),
 *     redirects to login and saves the path for return.
 *  3. If the user is on a public page (home, products), does NOT redirect —
 *     they can continue browsing as a guest.
 *
 * Must be rendered inside <AuthProvider>.
 */
export function SessionGuard() {
  const router = useRouter();
  const { clearSession } = useAuth();

  useEffect(() => {
    const handleSessionExpired = (event: CustomEvent) => {
      if (!(event.detail?.status === 401 && event.detail?.sessionExpired)) return;

      const currentPath = window.location.pathname;
      const search = new URLSearchParams(window.location.search);

      // 1. Always clear session state immediately — UI updates right away
      clearSession();

      // 2. Only redirect on true protected routes (not thank-you / guest success).
      if (!shouldRedirectToLoginAfterSessionExpired(currentPath, search)) {
        return;
      }

      sessionStorage.setItem("redirectAfterLogin", currentPath);
      router.push("/auth/login?session_expired=true");
    };

    window.addEventListener(
      "api-session-expired",
      handleSessionExpired as EventListener,
    );
    return () => {
      window.removeEventListener(
        "api-session-expired",
        handleSessionExpired as EventListener,
      );
    };
  }, [router, clearSession]);

  return null;
}
