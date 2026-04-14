"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaBoxArchive, FaBoxOpen } from "react-icons/fa6";
import { ImSpinner8 } from "react-icons/im";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

import { toggleProductArchive } from "@/app/(admin)/admin/products/_action/actions";

type Props = {
  productId: string;
  productName: string;
  isArchived: boolean;
  className?: string;
};

export function ArchiveButton({
  productId,
  productName,
  isArchived,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const targetState = !isArchived;

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();

    setLoading(true);

    const res = await toggleProductArchive(productId, targetState);

    if (res?.error) {
      toast.error(res.error);
      setLoading(false);
    } else {
      const actionText = targetState ? "archivado" : "reactivado";
      toast.success(`Producto "${productName}" ${actionText} correctamente`);

      router.refresh();
      setOpen(false);
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          type="button"
          disabled={loading}
          className={cn(
            "transition-colors",
            isArchived
              ? "hover:bg-green-700 bg-green-600 text-white border-none hover:text-white"
              : "hover:bg-amber-500 bg-amber-600 text-white border-none hover:text-white",
            className,
          )}
        >
          {isArchived ? (
            <>
              <FaBoxOpen className="size-4" /> Desarchivar
            </>
          ) : (
            <>
              <FaBoxArchive className="size-4" /> Archivar
            </>
          )}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isArchived
              ? "¿Reactivar este producto?"
              : "¿Archivar este producto?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isArchived ? (
              <>
                El producto <strong>{productName}</strong> volverá a ser visible
                para los clientes en la tienda.
              </>
            ) : (
              <>
                Estás a punto de ocultar <strong>{productName}</strong> de la
                tienda.
                <br />
                <br />A diferencia de eliminar, esto{" "}
                <strong>mantiene el historial de ventas</strong> y datos
                contables. Podrás reactivarlo cuando quieras.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-3 pt-2">
          <AlertDialogCancel className="px-3" disabled={loading}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleToggle}
            className={cn(
              "text-white px-3",
              isArchived
                ? "bg-green-600 hover:bg-green-700"
                : "bg-amber-600 hover:bg-amber-500",
            )}
            disabled={loading}
          >
            {loading ? (
              <>
                <ImSpinner8 className="size-4 animate-spin" />
                {isArchived ? "Reactivando..." : "Archivando..."}
              </>
            ) : (
              <>{isArchived ? "Sí, reactivar" : "Sí, archivar"}</>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
