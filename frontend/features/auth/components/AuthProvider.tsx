"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";

import { getMe, logout as apiLogout } from "@/lib/api/auth";
import { APIError } from "@/lib/api/client";

import type { User } from "@/types/user";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  user: User | null;
  status: AuthStatus;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  /** Clears auth state immediately without hitting the API. Use when a token
   *  expiry event is detected client-side and you need the UI to update now. */
  clearSession: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const router = useRouter();
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    try {
      const u = await getMe();
      setUser(u);
      setStatus("authenticated");
    } catch (e) {
      setUser(null);
      setStatus("unauthenticated");
      if (!(e instanceof APIError && e.status === 401)) {
        console.error("Auth refresh error:", e);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const clearSession = useCallback(() => {
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      clearSession();
      router.refresh();
      // Redirect is handled by the caller (Header, Sidebar, etc.)
    }
  }, [router, clearSession]);

  const value = useMemo(
    () => ({ user, status, refresh, logout, clearSession }),
    [user, status, refresh, logout, clearSession],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
