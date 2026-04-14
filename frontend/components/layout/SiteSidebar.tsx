"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

import type { CategoryLink } from "@/types/category";

export function SiteSidebar({
  categories,
  maxDiscount,
  onNavigate,
}: {
  categories: CategoryLink[];
  maxDiscount: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const isNovedades = pathname === "/novedades";
  const isRebajas = pathname === "/rebajas";
  const isCatalogo = pathname === "/catalogo";

  const handleLinkClick = (href: string, e: React.MouseEvent) => {
    if (pathname === href) {
      e.preventDefault();
      router.refresh();
      onNavigate?.();
    } else {
      onNavigate?.();
    }
  };

  return (
    <aside>
      <div className="px-6 flex flex-col mt-4">
        <div className="flex flex-col pb-4 mb-4 space-y-2 border-b border-neutral-300">
          <Link
            href="/rebajas"
            prefetch={false}
            aria-current={isRebajas ? "page" : undefined}
            className={cn(
              "fx-underline-anim w-max text-2xl font-semibold pt-1 text-red-600",
            )}
            onClick={(e) => handleLinkClick("/rebajas", e)}
          >
            Rebajas {maxDiscount > 0 && `-${maxDiscount}%`}
          </Link>

          <Link
            href="/novedades"
            prefetch={false}
            aria-current={isNovedades ? "page" : undefined}
            className={cn(
              "fx-underline-anim w-max text-2xl font-semibold pt-1",
            )}
            onClick={(e) => handleLinkClick("/novedades", e)}
          >
            Novedades
          </Link>
        </div>

        <ul className="h-full text-base space-y-2">
          {/* Enlace sintético arriba de todo */}
          <li key="all">
            <Link
              href="/catalogo"
              prefetch={false}
              aria-current={isCatalogo ? "page" : undefined}
              className={cn("fx-underline-anim")}
              onClick={(e) => handleLinkClick("/catalogo", e)}
            >
              Todas las prendas
            </Link>
          </li>

          {categories.map((c: CategoryLink) => {
            const categoryPath = `/cat/${c.slug}`;
            const isActive = pathname === categoryPath;

            return (
              <li key={c.slug}>
                <Link
                  href={categoryPath}
                  prefetch={false}
                  aria-current={isActive ? "page" : undefined}
                  className={cn("fx-underline-anim")}
                  onClick={(e) => handleLinkClick(categoryPath, e)}
                >
                  {c.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
