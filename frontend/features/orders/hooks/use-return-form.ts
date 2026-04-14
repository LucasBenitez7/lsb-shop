"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";

import { processPartialReturnAction } from "@/app/(admin)/admin/orders/actions";

import type { ReturnableItem } from "@/lib/orders/types";

export function useReturnForm(orderId: string, items: ReturnableItem[]) {
  const router = useRouter();

  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [customRejection, setCustomRejection] = useState("");

  // Mapa de selección
  const [returnMap, setReturnMap] = useState<Record<string, number>>({});

  // Inicializar mapa
  useEffect(() => {
    const initial: Record<string, number> = {};
    items.forEach((item) => {
      if (item.quantityReturnRequested > 0) {
        initial[item.id] = item.quantityReturnRequested;
      }
    });
    setReturnMap(initial);
  }, [items]);

  // Cálculos
  const totalRequestedQty = useMemo(
    () => items.reduce((acc, i) => acc + i.quantityReturnRequested, 0),
    [items],
  );

  const totalAcceptedQty = useMemo(
    () => Object.values(returnMap).reduce((acc, qty) => acc + qty, 0),
    [returnMap],
  );

  const isPartialRejection =
    totalRequestedQty > 0 && totalAcceptedQty < totalRequestedQty;

  // Handlers de Input
  const toggleItem = (itemId: string, max: number, checked: boolean) => {
    setReturnMap((prev) => {
      const next = { ...prev };
      if (checked) next[itemId] = max;
      else delete next[itemId];
      return next;
    });
  };

  const changeQty = (itemId: string, val: string, max: number) => {
    const num = parseInt(val) || 0;
    if (num < 0) return;
    if (num > max) return;
    setReturnMap((prev) => ({ ...prev, [itemId]: num }));
  };

  // --- LÓGICA DE ENVÍO (Submit) ---
  const handleSubmit = async () => {
    let finalRejectionNote = undefined;

    if (isPartialRejection) {
      if (!rejectionReason) {
        toast.error("Debes indicar un motivo para los artículos rechazados.");
        return;
      }
      finalRejectionNote =
        rejectionReason === "Otro motivo" ? customRejection : rejectionReason;

      if (rejectionReason === "Otro motivo" && !customRejection.trim()) {
        toast.error("Escribe el detalle del motivo.");
        return;
      }
    }

    setLoading(true);

    const payload = Object.entries(returnMap)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, qty]) => ({ itemId, qtyToReturn: qty }));

    const res = await processPartialReturnAction(
      orderId,
      payload,
      finalRejectionNote,
    );

    if (res.error) {
      toast.error(res.error);
      setLoading(false);
    } else {
      toast.success("Devolución procesada correctamente");
      router.push(`/admin/orders/${orderId}`);
      router.refresh();
    }
  };

  return {
    // Estado
    loading,
    returnMap,
    rejectionReason,
    setRejectionReason,
    customRejection,
    setCustomRejection,

    // Computados
    totalRequestedQty,
    totalAcceptedQty,
    isPartialRejection,

    // Acciones
    toggleItem,
    changeQty,
    handleSubmit,
  };
}
