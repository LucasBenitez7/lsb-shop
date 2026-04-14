import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-2xl font-bold tracking-tight">
        Página no encontrada
      </h2>
      <p className="text-muted-foreground">
        El recurso que buscas (pedido, producto o usuario) no existe o ha sido
        eliminado.
      </p>
      <Button asChild className="mt-4">
        <Link href="/admin">Volver al Dashboard</Link>
      </Button>
    </div>
  );
}
