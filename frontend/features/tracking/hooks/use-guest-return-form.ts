"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { requestReturnGuestAction } from "@/lib/guest-access/actions";

export function useGuestReturnForm(orderId: string) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  const [returnMap, setReturnMap] = useState<Record<string, number>>({});

  const totalItemsSelected = Object.keys(returnMap).length;
  const totalQtySelected = Object.values(returnMap).reduce((a, b) => a + b, 0);

  const toggleItem = (itemId: string, max: number, checked: boolean) => {
    setReturnMap((prev) => {
      const next = { ...prev };
      if (checked) {
        next[itemId] = max;
      } else {
        delete next[itemId];
      }
      return next;
    });
  };

  const changeQty = (itemId: string, val: string, max: number) => {
    const num = parseInt(val) || 0;

    if (num <= 0) {
      const next = { ...returnMap };
      delete next[itemId];
      setReturnMap(next);
      return;
    }

    setReturnMap((prev) => ({ ...prev, [itemId]: Math.min(num, max) }));
  };

  const handleSubmit = async () => {
    const finalReason =
      selectedReason === "Otro motivo" ? customReason : selectedReason;

    if (!finalReason.trim()) {
      toast.error("Por favor indica un motivo.");
      return;
    }

    const itemsPayload = Object.entries(returnMap).map(([itemId, qty]) => ({
      itemId,
      qty,
    }));

    if (itemsPayload.length === 0) {
      toast.error("Selecciona al menos un producto.");
      return;
    }

    setLoading(true);
    const res = await requestReturnGuestAction(
      orderId,
      finalReason,
      itemsPayload,
    );

    if (res?.error) {
      toast.error(res.error);
      setLoading(false);
    } else {
      toast.success("Solicitud enviada correctamente");
      router.push(`/tracking/${orderId}`);
      router.refresh();
    }
  };

  const handleCancel = () => router.back();

  return {
    // Estados
    loading,
    selectedReason,
    setSelectedReason,
    customReason,
    setCustomReason,
    returnMap,

    // Datos derivados
    totalItemsSelected,
    totalQtySelected,

    // Acciones
    toggleItem,
    changeQty,
    handleSubmit,
    handleCancel,
  };
}
