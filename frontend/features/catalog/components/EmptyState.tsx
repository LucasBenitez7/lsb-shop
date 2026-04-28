import Link from "next/link";

import { Button } from "@/components/ui/button";

type Props = {
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
};

export function EmptyState({
  title = "No se encontraron productos",
  description = "Intenta ajustar tus filtros o busca en otra categoría.",
  actionLabel = "Ver todo el catálogo",
  actionHref = "/catalogo",
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
      <p className="text-neutral-500 max-w-sm mt-2 mb-6 text-sm">
        {description}
      </p>
      <Button asChild variant="default" size="lg" className="px-3">
        <Link href={actionHref}>{actionLabel}</Link>
      </Button>
    </div>
  );
}
