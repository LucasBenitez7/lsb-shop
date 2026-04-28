import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nueva contraseña",
  robots: { index: false, follow: false },
};

export { default } from "../../../features/auth/components/ResetPasswordForm";
