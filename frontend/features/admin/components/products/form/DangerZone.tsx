"use client";

import { ArchiveButton, DeleteProductDialog } from "../../shared";

type Props = {
  productId: string;
  productName: string;
  isArchived: boolean;
};

export function DangerZone({ productId, productName, isArchived }: Props) {
  return (
    <div className="space-y-6 p-4 border rounded-xs shadow-sm bg-white">
      <h3 className="text-lg font-medium text-neutral-900">
        Gestión de Estado
      </h3>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-neutral-50 border border-neutral-200 p-4 rounded-xs gap-4">
          <div>
            <p className="text-sm font-medium text-neutral-900">
              {isArchived ? "Reactivar Producto" : "Archivar Producto"}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              {isArchived
                ? "Haz que el producto sea visible en la tienda nuevamente"
                : "Oculta el producto de la tienda sin perder su historial"}
            </p>
          </div>

          <ArchiveButton
            productId={productId}
            productName={productName}
            isArchived={isArchived}
          />
        </div>

        {/* CAJA 2: ELIMINAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-red-50 border border-red-100 p-4 rounded-xs gap-4">
          <div>
            <p className="text-sm font-medium text-red-900">
              Eliminar Producto
            </p>
            <p className="text-xs text-red-700 mt-1">
              Acción irreversible. Borra el producto permanentemente
            </p>
          </div>

          <DeleteProductDialog
            productId={productId}
            productName={productName}
          />
        </div>
      </div>
    </div>
  );
}
