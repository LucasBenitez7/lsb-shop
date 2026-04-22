"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";

import { AuthProvider } from "@/features/auth/components/AuthProvider";
import { CartSyncProvider } from "@/features/cart/components/CartSyncProvider";
import { SessionGuard } from "@/components/SessionGuard";

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
      <AuthProvider>
        <CartSyncProvider>
          <SessionGuard />
          {children}
        </CartSyncProvider>
      </AuthProvider>
    </GoogleBridge>
  );
}
