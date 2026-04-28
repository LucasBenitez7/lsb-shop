"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";

import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

interface Props {
  totalPages: number;
  page: number;
  base?: string;
  className?: string;
}

export function PaginationNav({ totalPages, page, base, className }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const basePath = base ?? pathname;

  if (totalPages <= 1) return null;

  const createPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", pageNumber.toString());
    return `${basePath}?${params.toString()}`;
  };

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav
      aria-label="Paginación"
      className={cn("flex items-center justify-end gap-2 mt-4", className)}
    >
      <Button
        variant="outline"
        size="icon"
        asChild
        disabled={!hasPrev}
        className={cn("h-8 w-8", !hasPrev && "opacity-50 pointer-events-none")}
      >
        <Link href={createPageUrl(page - 1)} rel="prev" aria-label="Anterior">
          <FaChevronLeft className="size-4 hover:cursor-pointer" />
        </Link>
      </Button>

      <span className="text-sm font-medium px-2">
        Página {page} de {totalPages}
      </span>

      <Button
        variant="outline"
        size="icon"
        asChild
        disabled={!hasNext}
        className={cn("h-8 w-8", !hasNext && "opacity-50 pointer-events-none")}
      >
        <Link href={createPageUrl(page + 1)} rel="next" aria-label="Siguiente">
          <FaChevronRight className="size-4 hover:cursor-pointer" />
        </Link>
      </Button>
    </nav>
  );
}
