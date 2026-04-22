"use client";

import type { UserAddress } from "@/types/address";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";

import {
  loadGuestAddress,
  saveGuestAddress,
} from "@/lib/checkout/guest-address-storage";
import { type CreateOrderInput } from "@/lib/orders/schema";

export function useShippingSection(
  savedAddresses: UserAddress[],
  selectedAddressId: string,
  setSelectedAddressId: (id: string) => void,
  isAddressConfirmed: boolean,
  onConfirmAddress: () => void,
  onChangeAddress: () => void,
  isGuest: boolean,
) {
  const router = useRouter();
  const { setValue, watch, resetField, clearErrors } =
    useFormContext<CreateOrderInput>();

  const shippingType = watch("shippingType");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [addressToEdit, setAddressToEdit] = useState<UserAddress | null>(null);
  const [guestAddress, setGuestAddress] = useState<UserAddress | null>(() =>
    isGuest ? loadGuestAddress() : null,
  );

  const [isSelectingMethod, setIsSelectingMethod] = useState(!shippingType);
  const hasRestoredGuest = useRef(false);

  useEffect(() => {
    if (isGuest && !hasRestoredGuest.current) {
      const stored = loadGuestAddress();
      if (stored) {
        hasRestoredGuest.current = true;
        setGuestAddress(stored);
        setSelectedAddressId("guest-temp-id");
        setValue("firstName", stored.firstName);
        setValue("lastName", stored.lastName);
        setValue("phone", stored.phone || "");
        setValue("street", stored.street);
        setValue("details", stored.details ?? "");
        setValue("postalCode", stored.postalCode);
        setValue("city", stored.city);
        setValue("province", stored.province);
        setValue("country", stored.country);
        onConfirmAddress();
      }
    }
  }, [isGuest, setSelectedAddressId, setValue, onConfirmAddress]);

  // --- Handlers ---
  const handleChangeMethod = () => {
    setIsSelectingMethod(true);
    onChangeAddress();
  };

  const handleSelectMethod = (type: "home" | "store" | "pickup") => {
    setValue("shippingType", type);
    setIsSelectingMethod(false);
    clearErrors();
    onChangeAddress();
  };

  const handleSelectAddress = (id: string) => {
    if (!isAddressConfirmed) {
      setSelectedAddressId(id);
    }
  };

  const handleEditClick = (e: React.MouseEvent, addr: UserAddress) => {
    e.stopPropagation();
    setAddressToEdit(addr);
    setIsFormOpen(true);
  };

  const handleAddNewClick = () => {
    setAddressToEdit(null);
    setIsFormOpen(true);
  };

  const handleFormSuccess = (updatedAddress: UserAddress) => {
    setIsFormOpen(false);
    toast.success(
      addressToEdit ? "Dirección actualizada" : "Dirección guardada",
    );
    if (updatedAddress.id === "guest-temp-id") {
      setGuestAddress(updatedAddress);
      saveGuestAddress(updatedAddress);
    } else {
      // User registrado: refrescar la lista desde el servidor
      router.refresh();
    }
    setSelectedAddressId(updatedAddress.id);
    onConfirmAddress();
  };

  const handleCancelForm = () => {
    setIsFormOpen(false);
    setAddressToEdit(null);
  };

  return {
    shippingType,
    isFormOpen,
    addressToEdit,
    isSelectingMethod,
    handleSelectMethod,
    handleChangeMethod,
    handleSelectAddress,
    handleEditClick,
    handleAddNewClick,
    handleFormSuccess,
    handleCancelForm,
    guestAddress,
  };
}
