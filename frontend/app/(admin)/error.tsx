"use client";

import { useEffect } from "react";
import { FaTriangleExclamation } from "react-icons/fa6";

import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin Error:", error);
  }, [error]);

  return (
    <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-full bg-red-100 p-4 text-red-600">
        <FaTriangleExclamation className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">
        Algo salió mal en el panel
      </h2>
      <p className="text-sm text-muted-foreground max-w-md">
        Ha ocurrido un error inesperado al cargar esta sección. Si el problema
        persiste, contacta con soporte técnico.
      </p>
      <div className="flex gap-4">
        <Button onClick={() => reset()} variant="default">
          Intentar de nuevo
        </Button>
        <Button onClick={() => window.location.reload()} variant="outline">
          Recargar página
        </Button>
      </div>
    </div>
  );
}
