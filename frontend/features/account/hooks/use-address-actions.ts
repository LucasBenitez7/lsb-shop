"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { deleteAddress, setDefaultAddress } from "@/lib/api/account";

export function useAddressActions() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const setAsDefault = async (addressId: string) => {
    setLoading(true);
    try {
      await setDefaultAddress(addressId);
      toast.success("Dirección principal actualizada");
      router.refresh();
    } catch (error) {
      toast.error("Error al actualizar");
    } finally {
      setLoading(false);
    }
  };

  const removeAddress = async (addressId: string) => {
    setLoading(true);
    try {
      await deleteAddress(addressId);
      toast.success("Dirección eliminada");
      router.refresh();
    } catch (error) {
      toast.error("Error al eliminar");
    } finally {
      setLoading(false);
    }
  };

  return { loading, setAsDefault, removeAddress };
}
