/**
 * Development helper to clear all client-side state (cookies, localStorage, sessionStorage).
 * Run this in the browser console when you need a fresh start:
 *
 * ```
 * (window as any).__clearDevState?.()
 * ```
 *
 * Or add a button in the UI during development.
 */
export function clearDevState() {
  if (process.env.NODE_ENV === "production") {
    console.warn("clearDevState is only available in development");
    return;
  }

  console.log("🧹 Clearing all development state...");

  // 1. Clear localStorage
  try {
    localStorage.clear();
    console.log("✅ localStorage cleared");
  } catch (e) {
    console.error("❌ Failed to clear localStorage:", e);
  }

  // 2. Clear sessionStorage
  try {
    sessionStorage.clear();
    console.log("✅ sessionStorage cleared");
  } catch (e) {
    console.error("❌ Failed to clear sessionStorage:", e);
  }

  // 3. Clear all cookies (including httpOnly ones via API call)
  try {
    // Clear browser-accessible cookies
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substring(0, eqPos).trim() : c.trim();
      // Set expiry to the past to delete
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost`;
    });
    console.log("✅ Browser cookies cleared");
  } catch (e) {
    console.error("❌ Failed to clear cookies:", e);
  }

  // 4. Call Django logout to clear httpOnly JWT cookies server-side
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  fetch(`${apiUrl}/api/v1/auth/logout/`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  })
    .then(() => {
      console.log("✅ Server session cleared (JWT cookies deleted)");
      console.log("🎉 All state cleared! Reloading page...");
      setTimeout(() => window.location.href = "/", 500);
    })
    .catch((err) => {
      console.error("❌ Failed to clear server session:", err);
      console.log("🔄 Reloading anyway...");
      setTimeout(() => window.location.href = "/", 500);
    });
}

/**
 * Simulates a session expiration by clearing JWT cookies directly.
 * Use this to test the session expiration flow without waiting for tokens to expire.
 *
 * ```
 * (window as any).__simulateSessionExpired?.()
 * ```
 *
 * This will:
 * 1. Delete JWT cookies (simulating expired tokens)
 * 2. Trigger the session expiration event
 * 3. The UI will update as if the session expired naturally
 */
export function simulateSessionExpired() {
  if (process.env.NODE_ENV === "production") {
    console.warn("simulateSessionExpired is only available in development");
    return;
  }

  console.log("⏰ Simulating session expiration...");

  // 1. Delete JWT cookies to simulate expiration
  const jwtCookies = ["lsb-access-token", "lsb-refresh-token"];
  jwtCookies.forEach((name) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost`;
  });
  console.log("✅ JWT cookies deleted");

  // 2. Emit the session-expired event that the SessionGuard listens to
  const event = new CustomEvent("api-session-expired", {
    detail: { status: 401, sessionExpired: true },
  });
  window.dispatchEvent(event);
  console.log("✅ Session expired event emitted");
  console.log("👀 Watch the UI — should clear session and (maybe) redirect to login");
}

// Expose globally for console access in development
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  (window as any).__clearDevState = clearDevState;
  (window as any).__simulateSessionExpired = simulateSessionExpired;
}
