import { redirect } from "next/navigation";

import ChangePasswordForm from "@/features/account/components/ChangePasswordForm";

import { auth } from "@/lib/api/auth/server";


import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seguridad",
  description: "Gestiona la seguridad de tu cuenta y cambia tu contraseña.",
  robots: { index: false, follow: false },
};

export default async function SecurityPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login?redirectTo=/account/security");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-center sm:text-left font-semibold pb-2 border-b border-neutral-300">
          Seguridad
        </h2>
      </div>

      <ChangePasswordForm />
    </div>
  );
}
