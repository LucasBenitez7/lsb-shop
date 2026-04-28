"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { Suspense } from "react";

import { AuthProvider } from "@/features/auth/components/AuthProvider";
import { SessionGuard } from "@/features/auth/components/SessionGuard";
import { CartSyncProvider } from "@/features/cart/components/CartSyncProvider";

// Development helper — exposes window.__clearDevState() in dev mode
if (process.env.NODE_ENV === "development") {
  import("@/lib/dev/clear-dev-state");
}

type ProvidersProps = {
  children: React.ReactNode;
};

function GoogleBridge({ children }: { children: React.ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  if (!clientId) {
    return <>{children}</>;
  }
  return <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <GoogleBridge>
      <Suspense fallback={null}>
        <AuthProvider>
          <CartSyncProvider>
            <SessionGuard />
            {children}
          </CartSyncProvider>
        </AuthProvider>
      </Suspense>
    </GoogleBridge>
  );
}
