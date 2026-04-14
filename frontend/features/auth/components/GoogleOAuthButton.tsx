"use client";

import { useGoogleLogin } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FcGoogle } from "react-icons/fc";

import { Button } from "@/components/ui/button";

import { googleLogin } from "@/lib/api/auth";
import { APIError } from "@/lib/api/client";

import { useAuth } from "./AuthProvider";

type GoogleOAuthButtonProps = {
  redirectTo: string;
  label?: string;
};

export function GoogleOAuthButton({
  redirectTo,
  label = "Continuar con Google",
}: GoogleOAuthButtonProps) {
  const router = useRouter();
  const { refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const login = useGoogleLogin({
    flow: "implicit",
    onSuccess: async (tokenResponse) => {
      setError(null);
      setPending(true);
      try {
        await googleLogin(tokenResponse.access_token);
        await refresh();
        router.refresh();
        router.push(redirectTo);
      } catch (e) {
        if (e instanceof APIError) {
          setError(e.message);
        } else {
          setError("No se pudo iniciar sesión con Google.");
        }
      } finally {
        setPending(false);
      }
    },
    onError: () => {
      setError("Google no está disponible. Inténtalo de nuevo.");
    },
  });

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full h-10 gap-2"
        disabled={pending}
        onClick={() => login()}
      >
        <FcGoogle className="size-5 shrink-0" aria-hidden />
        {pending ? "Conectando…" : label}
      </Button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
