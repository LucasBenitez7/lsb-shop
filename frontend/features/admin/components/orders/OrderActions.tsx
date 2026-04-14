"use client";

import type { FulfillmentStatus, PaymentStatus } from "@/types/enums";
import { useState } from "react";
import { FaBox, FaTruckFast, FaCheckDouble, FaLock } from "react-icons/fa6";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { updateFulfillmentStatusAction } from "@/app/(admin)/admin/orders/actions";

type Props = {
  orderId: string;
  currentStatus: FulfillmentStatus;
  paymentStatus: PaymentStatus;
  isCancelled: boolean;
};

export function AdminFulfillmentActions({
  orderId,
  currentStatus,
  paymentStatus,
  isCancelled,
}: Props) {
  const [loading, setLoading] = useState(false);

  if (isCancelled) return null;

  const isPaid = paymentStatus === "PAID";

  const handleUpdate = async (nextStatus: FulfillmentStatus) => {
    setLoading(true);
    const res = await updateFulfillmentStatusAction(orderId, nextStatus);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Estado logístico actualizado");
    }
    setLoading(false);
  };

  const LockedButton = () => (
    <Button
      disabled
      className="bg-neutral-100 text-neutral-600 border border-neutral-200 cursor-not-allowed shadow-none"
    >
      <FaLock className="size-3.5" />
      Esperando Pago...
    </Button>
  );

  if (currentStatus === "UNFULFILLED") {
    if (!isPaid) {
      return <LockedButton />;
    }

    return (
      <Button
        onClick={() => handleUpdate("PREPARING")}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
      >
        <FaBox className="size-3.5" />
        Preparar Pedido
      </Button>
    );
  }

  if (currentStatus === "PREPARING") {
    if (!isPaid) {
      return <LockedButton />;
    }

    return (
      <Button
        onClick={() => handleUpdate("SHIPPED")}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
      >
        <FaTruckFast className="size-3.5" />
        Marcar como Enviado
      </Button>
    );
  }

  // 3. ESTADO: ENVIADO -> ENTREGADO
  if (currentStatus === "SHIPPED" || currentStatus === "READY_FOR_PICKUP") {
    return (
      <Button
        onClick={() => handleUpdate("DELIVERED")}
        disabled={loading}
        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
      >
        <FaCheckDouble className="size-3.5" />
        Confirmar Entrega
      </Button>
    );
  }

  return null;
}
