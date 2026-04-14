import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/server";

import { RegisterForm } from "../../../../features/auth/components/RegisterForm";

import type { Metadata } from "next";

type Props = {
  searchParams: Promise<{ redirectTo?: string }>;
};

export const metadata: Metadata = {
  title: "Crear cuenta",
  description:
    "Regístrate en LSB Shop para acceder a tu historial de pedidos, guardar direcciones y más.",
  robots: { index: false, follow: false },
};

export default async function RegisterPage({ searchParams }: Props) {
  const session = await auth();
  const sp = await searchParams;

  const redirectTo = sp.redirectTo ?? "/";

  if (session?.user) {
    redirect(redirectTo);
  }

  return (
    <div className="flex flex-1 min-h-0 items-center justify-center w-full overflow-y-auto py-4">
      <div className="w-full sm:w-lg border p-6 bg-background rounded-xs shadow-sm my-auto">
        <div className="flex flex-col space-y-2 text-center mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Crear cuenta
          </h1>
        </div>

        <RegisterForm redirectTo={redirectTo} />
      </div>
    </div>
  );
}
