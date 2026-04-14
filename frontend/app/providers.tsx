"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";

import { AuthProvider } from "@/features/auth/components/AuthProvider";

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
      <AuthProvider>{children}</AuthProvider>
    </GoogleBridge>
  );
}
