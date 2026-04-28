import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verificar correo",
  robots: { index: false, follow: false },
};

export { default } from "@/features/auth/components/VerifyEmailPage";
