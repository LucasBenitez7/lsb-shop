import Image from "next/image";
import Link from "next/link";
import { type ReactNode } from "react";

import { Footer } from "@/components/layout/Footer";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col font-sans">
      <header className="sticky top-0 z-[40] flex h-[var(--header-h)] w-full items-center border-b bg-background justify-center">
        <Link
          href="/"
          className="mx-2 flex justify-self-center px-2 focus:outline-none"
          aria-label="LSB Shop — Inicio"
        >
          <Image
            src="/images/logo.png"
            alt="LSB Shop"
            width={260}
            height={88}
            priority
            className="h-7 w-auto object-contain dark:invert"
          />
        </Link>
      </header>

      <div className="flex-1 flex flex-col p-4">{children}</div>

      <Footer />
    </div>
  );
}
