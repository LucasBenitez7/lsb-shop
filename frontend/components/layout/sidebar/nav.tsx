"use client";

import type { MouseEvent, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useSidebarClose } from "./close-context";
import { cn } from "@/lib/utils";

export type SidebarNavLinkClickAction = (href: string, e: MouseEvent) => void;

/**
 * Same route → prevent default, refresh, then close sheet.
 * Different route → close sheet after navigation (Next Link handles href).
 */
export function useSidebarNavLinkHandler(): {
  pathname: string;
  handleLinkClick: SidebarNavLinkClickAction;
} {
  const pathname = usePathname();
  const router = useRouter();
  const afterNavigate = useSidebarClose();

  const handleLinkClick: SidebarNavLinkClickAction = (href, e) => {
    if (pathname === href) {
      e.preventDefault();
      router.refresh();
    }
    afterNavigate();
  };

  return { pathname, handleLinkClick };
}

type SidebarNavLinkProps = {
  href: string;
  pathname: string;
  onLinkClickAction: SidebarNavLinkClickAction;
  className?: string;
  children: ReactNode;
};

/**
 * Single implementation for sidebar internal links: prefetch off, active route,
 * underline animation, and shared click behavior (refresh-if-same + close sheet).
 */
export function SidebarNavLink({
  href,
  pathname,
  onLinkClickAction,
  className,
  children,
}: SidebarNavLinkProps) {
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      prefetch={false}
      aria-current={isActive ? "page" : undefined}
      className={cn("fx-underline-anim", className)}
      onClick={(e) => onLinkClickAction(href, e)}
    >
      {children}
    </Link>
  );
}
