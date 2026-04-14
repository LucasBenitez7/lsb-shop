"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaTrash, FaTriangleExclamation } from "react-icons/fa6";
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

import { deleteProductAction } from "../../_action/actions";

interface Props {
  productId: string;
  productName: string;
  asIcon?: boolean;
}

export function DeleteProductDialog({
  productId,
  productName,
  asIcon = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async (e: React.MouseEvent) => {
    // 1. Evita cierre automático
    e.preventDefault();

    setIsDeleting(true);
    const res = await deleteProductAction(productId);

    if (res?.error) {
      toast.error(res.error);
      setIsDeleting(false);
    } else {
      toast.success("Producto eliminado correctamente");

      setOpen(false);
      setIsDeleting(false);

      if (!asIcon) {
        router.push("/admin/products");
      } else {
        router.refresh();
      }
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {asIcon ? (
          <Button
            variant="ghost"
            size="icon"
            className="text-neutral-400 hover:text-red-600 hover:bg-red-50"
          >
            <FaTrash className="size-4" />
          </Button>
        ) : (
          <Button variant="destructive">
            <FaTrash className="size-4" /> Eliminar
          </Button>
        )}
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <FaTriangleExclamation /> ¿Estás seguro?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Estás a punto de eliminar permanentemente{" "}
            <strong>{productName}</strong>. Esta acción{" "}
            <strong>no se puede deshacer</strong>.
            <br />
            <br />
            Nota: Si el producto tiene ventas asociadas, no podrás eliminarlo
            (para proteger la base de datos). En ese caso, te sugerimos{" "}
            <strong>archivar</strong> el producto.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-3">
          <AlertDialogCancel className="px-3" disabled={isDeleting}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 text-white px-3"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <ImSpinner8 className="size-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              "Sí, eliminar producto"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
