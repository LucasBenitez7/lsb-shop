import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/server";

import { LoginForm } from "@/features/auth/components/LoginForm";

import type { Metadata } from "next";

type Props = {
  searchParams: Promise<{ redirectTo?: string }>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description:
    "Accede a tu cuenta de LSB Shop para gestionar tus pedidos, direcciones y favoritos.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: Props) {
  const session = await auth();
  const sp = await searchParams;
  let redirectToParam = sp.redirectTo;

  if (redirectToParam && !redirectToParam.startsWith("/")) {
    redirectToParam = "/";
  }

  const redirectTo = redirectToParam || "/";

  if (session?.user) {
    redirect(redirectTo);
  }

  return (
    <div className="flex flex-1 min-h-0 items-center justify-center w-full overflow-y-auto py-4">
      <div className="w-full sm:w-md border p-6 bg-background rounded-xs shadow-sm my-auto">
        <div className="flex flex-col space-y-2 text-center mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Iniciar sesión
          </h1>
        </div>

        <LoginForm redirectTo={redirectTo} />
      </div>
    </div>
  );
}
