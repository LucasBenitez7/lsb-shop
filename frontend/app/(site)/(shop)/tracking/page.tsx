import { Suspense } from "react";

import { GuestAccessForm } from "@/features/tracking/components/GuestAccessForm";
import { Container } from "@/components/ui";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Seguimiento de Pedido",
  description:
    "Consulta el estado de tu pedido en LSB Shop o tramita una devolución como invitado.",
  alternates: { canonical: "/tracking" },
};

export default function TrackingPage() {
  return (
    <Container className="pt-10 pb-8 px-4 max-w-xl mx-auto">
      <div className="text-center mb-6 space-y-3">
        <h1 className="text-3xl font-semibold">Seguimiento de Pedido</h1>
        <p className="text-muted-foreground">
          Si realizaste tu pedido como invitado, introduce tu número de pedido y
          email para gestionar devoluciones o ver el estado.
        </p>
      </div>

      <Suspense fallback={<div>Cargando...</div>}>
        <GuestAccessForm />
      </Suspense>
    </Container>
  );
}
