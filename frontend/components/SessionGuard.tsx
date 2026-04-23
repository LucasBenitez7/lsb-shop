"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/features/auth/components/AuthProvider";

/**
 * Paths that require authentication. If the session expires while the user
 * is on one of these, redirect to login. Otherwise, just clear the session
 * and let them continue as a guest.
 */
const PROTECTED_PATH_PREFIXES = ["/account", "/admin", "/checkout"];

/**
 * Listens for `api-session-expired` events emitted by `apiFetch` when both
 * the access token and the refresh token are expired.
 *
 * When fired it:
 *  1. Clears the auth state immediately (user → null, status → unauthenticated)
 *     so the Header dropdown disappears right away.
 *  2. If the user is on a protected page (account, checkout, admin), redirects
 *     to login and saves the path for return.
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

      // 1. Always clear session state immediately — UI updates right away
      clearSession();

      // 2. Only redirect if the user is on a protected page
      const isProtectedPage = PROTECTED_PATH_PREFIXES.some((prefix) =>
        currentPath.startsWith(prefix),
      );

      if (isProtectedPage) {
        sessionStorage.setItem("redirectAfterLogin", currentPath);
        router.push("/auth/login?session_expired=true");
      }
      // else: user stays on current page (home, products, etc.) — they can browse as guest
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
