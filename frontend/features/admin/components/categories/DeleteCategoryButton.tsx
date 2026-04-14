"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { deleteCategoryAction } from "@/app/(admin)/admin/categories/actions";

interface Props {
  id: string;
  hasProducts: boolean;
}

export function DeleteCategoryButton({ id, hasProducts }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleOpenCheck = () => {
    if (hasProducts) {
      toast.error("No puedes borrar una categoría con productos.", {
        description: "Mueve o elimina los productos asociados primero.",
      });
      return;
    }
    setOpen(true);
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await deleteCategoryAction(id);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Categoría eliminada correctamente");
        setOpen(false);
      }
      router.push("/admin/categories");
    } catch {
      toast.error("Error inesperado al eliminar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        onClick={handleOpenCheck}
        disabled={loading}
      >
        {loading ? "Borrando..." : "Eliminar"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Estás completamente seguro?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. La categoría se eliminará
              permanentemente.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-3 mt-3">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="py-3"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
              className="py-3"
            >
              {loading ? "Eliminando..." : "Sí, eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
