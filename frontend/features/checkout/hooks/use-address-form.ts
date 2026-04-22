"use client";

import type { UserAddress } from "@/types/address";
import { useTransition, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";

import { type CreateOrderInput } from "@/lib/orders/schema";

import { upsertAddress } from "@/lib/api/account";

type Props = {
  initialData?: Partial<UserAddress> | null;
  onCancel: () => void;
  onSuccess: (address: UserAddress) => void;
  isGuest: boolean;
};

export function useShippingAddressForm({
  initialData,
  onCancel,
  onSuccess,
  isGuest,
}: Props) {
  const { setValue, trigger, getValues } = useFormContext<CreateOrderInput>();
  const [isPending, startTransition] = useTransition();

  // 1. Cargar datos iniciales al abrir
  useEffect(() => {
    if (initialData) {
      setValue("firstName", initialData.firstName || "");
      setValue("lastName", initialData.lastName || "");
      setValue("phone", initialData.phone || "");
      setValue("street", initialData.street || "");
      setValue("postalCode", initialData.postalCode || "");
      setValue("city", initialData.city || "");
      setValue("province", initialData.province || "");
      setValue("country", initialData.country || "España");
      setValue("details", initialData.details ?? "");
      setValue("isDefault", initialData.isDefault || false);
    } else {
      setValue("isDefault", false);
    }
  }, [initialData, setValue]);

  // 2. Guardar OBLIGATORIAMENTE en la Base de Datos
  const handleSaveAndUse = async () => {
    const isValid = await trigger([
      "email",
      "firstName",
      "lastName",
      "phone",
      "street",
      "postalCode",
      "city",
      "province",
      "country",
      "details",
    ]);

    if (!isValid) {
      toast.error("Revisa los campos obligatorios");
      return;
    }

    const values = getValues();

    if (isGuest) {
      // --- CAMINO A: INVITADO ---
      const guestAddress = {
        id: "guest-temp-id",
        userId: "guest",
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        street: values.street!,
        details: values.details,
        postalCode: values.postalCode!,
        city: values.city!,
        province: values.province!,
        country: values.country!,
        isDefault: false,
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      toast.success("Dirección de entrega establecida");
      onSuccess(guestAddress as UserAddress);
      return;
    }

    // --- CAMINO B: USUARIO REGISTRADO ---
    startTransition(async () => {
      try {
        const savedAddr = await upsertAddress({
          id: initialData?.id,
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone,
          street: values.street!,
          postalCode: values.postalCode!,
          city: values.city!,
          province: values.province!,
          country: values.country!,
          details: values.details ?? undefined,
          isDefault: !!values.isDefault,
        });

        if (!savedAddr) {
          toast.error("Error al guardar la dirección");
          return;
        }

        toast.success("Dirección guardada correctamente");
        onSuccess(savedAddr);
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Error al guardar la dirección.",
        );
      }
    });
  };

  return {
    isPending,
    handleSaveAndUse,
  };
}
