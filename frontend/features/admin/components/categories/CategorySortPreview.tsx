import Link from "next/link";
import { FaPencil } from "react-icons/fa6";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

type CategorySimple = {
  id: string;
  name: string;
  sort: number;
  isFeatured?: boolean;
};

interface Props {
  existingCategories: CategorySimple[];
  currentId?: string;
}

export function CategorySortPreview({ existingCategories, currentId }: Props) {
  return (
    <div className="bg-background border rounded-xs p-4 px-3 space-y-3 h-fit">
      <div className="space-y-1">
        <h3 className="font-semibold text-base">Orden Actual del Menu</h3>
        <p className="text-xs text-muted-foreground">
          Referencia para elegir la prioridad.
        </p>
      </div>

      <div className="space-y-2 overflow-y-auto scrollbar-thin">
        {existingCategories.length === 0 && (
          <p className="text-xs text-neutral-400 italic">
            No hay categorías aún.
          </p>
        )}

        {existingCategories.map((cat) => {
          const isCurrent = cat.id === currentId;
          return (
            <div key={cat.id} className="flex items-center gap-2 group">
              <div
                className={cn(
                  "flex items-center gap-3 p-2 rounded-xs text-sm border transition-colors flex-1 min-w-0",
                  isCurrent
                    ? "bg-foreground text-background"
                    : "bg-background border hover:border-neutral-200",
                )}
              >
                <Badge
                  variant={isCurrent ? "default" : "secondary"}
                  className={cn(
                    "w-6 h-6 flex items-center font-semibold justify-center text-xs flex-shrink-0",
                    isCurrent && "text-background",
                  )}
                >
                  {cat.sort}
                </Badge>
                <span className={cn("truncate font-medium flex-1")}>
                  {cat.name}
                </span>
                {cat.isFeatured ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 h-5 shrink-0 font-medium",
                      "border-amber-500 bg-amber-50 text-amber-900",
                      isCurrent &&
                        "border-amber-300 bg-amber-400/25 text-amber-50 ring-1 ring-amber-200/80",
                    )}
                  >
                    Destacada
                  </Badge>
                ) : null}
              </div>

              <Button
                variant="ghost"
                asChild
                className="h-10 w-10 hover:bg-blue-600 active:bg-blue-600 hover:text-white active:text-white flex-shrink-0"
              >
                {!isCurrent ? (
                  <Link href={`/admin/categories/${cat.id}`}>
                    <FaPencil className="size-3" />
                  </Link>
                ) : (
                  <FaPencil className="size-3 opacity-0 pointer-events-none" />
                )}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t text-xs text-neutral-400 leading-tight">
        <p>
          💡 Tip: Si repites un número, el sistema moverá automáticamente los
          demás hacia abajo.
        </p>
      </div>
    </div>
  );
}
