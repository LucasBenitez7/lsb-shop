import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ScrollToTop } from "@/components/layout/ScrollToTop";

import { canAccessAdmin } from "@/lib/roles";
import { auth } from "@/lib/auth/server";

import { AdminHeader } from "../../features/admin/components/AdminHeader";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panel de Administración",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login?redirectTo=/admin");
  }

  if (!canAccessAdmin(session.user.role)) {
    redirect("/");
  }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 font-sans text-foreground">
      <Suspense fallback={null}>
        <ScrollToTop />
      </Suspense>

      <AdminHeader
        user={session.user}
        isReadOnly={session.user.role === "demo"}
      />

      <main className="flex-1 p-4 pb-10 sm:pt-4 sm:px-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
