"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";

import { createOrder as _createOrder } from "@/lib/api/orders";
import { useCartStore } from "@/store/useCartStore";

import type { CreateOrderInput } from "@/lib/orders/schema";
import type { UserAddress } from "@/types/address";

export function useCheckout(savedAddresses: UserAddress[]) {
  const router = useRouter();
  const { items } = useCartStore();

  const { handleSubmit, setValue, watch, trigger, getValues } =
    useFormContext<CreateOrderInput>();

  const shippingType = watch("shippingType");

  const [selectedAddressId, setSelectedAddressId] = useState<string>(() => {
    const def = savedAddresses.find((a) => a.isDefault);
    return def ? def.id : "";
  });

  const [isAddressConfirmed, setIsAddressConfirmed] = useState(() => {
    return savedAddresses.some((a) => a.isDefault);
  });
  const [isPending, setIsPending] = useState(false);

  const [stripeData, setStripeData] = useState<{
    clientSecret: string;
    orderId: string;
  } | null>(null);

  const isSubmittingRef = useRef(false);
  const stripeDataRef = useRef<{
    clientSecret: string;
    orderId: string;
  } | null>(null);
  useEffect(() => {
    stripeDataRef.current = stripeData;
  }, [stripeData]);

  useEffect(() => {
    const savedSession = localStorage.getItem("checkout_session");
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        const now = new Date().getTime();
        if (now - parsed.timestamp >= 3600000) {
          localStorage.removeItem("checkout_session");
        }
      } catch (e) {
        localStorage.removeItem("checkout_session");
      }
    }
  }, []);

  useEffect(() => {
    const formItems = items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      priceCents: Math.round(item.price * 100),
    }));
    setValue("cartItems", formItems);
  }, [items, setValue]);

  useEffect(() => {
    if (shippingType === "home" && selectedAddressId) {
      const addr = savedAddresses.find((a) => a.id === selectedAddressId);
      if (addr) {
        setValue("firstName", addr.firstName);
        setValue("lastName", addr.lastName);
        setValue("phone", addr.phone || "");
        setValue("street", addr.street);
        setValue("details", addr.details ?? "");
        setValue("postalCode", addr.postalCode);
        setValue("city", addr.city);
        setValue("province", addr.province);
        setValue("country", addr.country);
      }
    }
  }, [selectedAddressId, shippingType, savedAddresses, setValue]);

  const handleConfirmAddress = useCallback(async () => {
    if (isSubmittingRef.current || stripeDataRef.current) return;
    isSubmittingRef.current = true;
    let isValid = false;

    if (shippingType === "home") {
      isValid = await trigger([
        "firstName",
        "lastName",
        "street",
        "city",
        "province",
        "postalCode",
        "phone",
      ]);
    } else {
      isValid = await trigger(["storeLocationId", "pickupLocationId"]);
    }

    if (!isValid) {
      toast.error("Por favor, completa los datos de envío obligatorios.");
      return;
    }

    if (items.length === 0) {
      toast.error("Tu carrito está vacío.");
      return;
    }

    setIsPending(true);

    const currentData = getValues();
    currentData.paymentMethod = "card";

    const freshCartItems = items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      priceCents: Math.round(item.price * 100),
    }));
    currentData.cartItems = freshCartItems;

    const formData = new FormData();
    Object.entries(currentData).forEach(([key, val]) => {
      if (key !== "cartItems" && val !== null && val !== undefined) {
        formData.append(key, String(val));
      }
    });
    formData.append("cartItems", JSON.stringify(currentData.cartItems));

    const cartFingerprint = JSON.stringify(
      [...currentData.cartItems].sort((a, b) =>
        a.variantId.localeCompare(b.variantId),
      ),
    );

    let orderIdToRecycle: string | undefined = undefined;

    const savedSession = localStorage.getItem("checkout_session");
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        const sessionFingerprint = parsed.cartFingerprint ?? null;
        const cartUnchanged = sessionFingerprint === cartFingerprint;

        if (items.length > 0 && cartUnchanged) {
          orderIdToRecycle = parsed.orderId;
        } else if (!cartUnchanged) {
          localStorage.removeItem("checkout_session");
        }
      } catch (e) {}
    }

    if (orderIdToRecycle) {
      formData.append("existingOrderId", orderIdToRecycle);
    }

    try {
      const parsed = Object.fromEntries(formData.entries());
      const cartItems = JSON.parse(
        (parsed.cartItems as string) || "[]",
      ) as { variantId: string; quantity: number }[];

      const res = await _createOrder({
        email: String(parsed.email ?? ""),
        firstName: String(parsed.firstName ?? ""),
        lastName: String(parsed.lastName ?? ""),
        phone: String(parsed.phone ?? ""),
        shippingType: String(parsed.shippingType ?? "home"),
        street: parsed.street ? String(parsed.street) : undefined,
        details: parsed.details ? String(parsed.details) : undefined,
        postalCode: parsed.postalCode ? String(parsed.postalCode) : undefined,
        city: parsed.city ? String(parsed.city) : undefined,
        province: parsed.province ? String(parsed.province) : undefined,
        country: parsed.country ? String(parsed.country) : undefined,
        storeLocationId: parsed.storeLocationId
          ? String(parsed.storeLocationId)
          : undefined,
        pickupLocationId: parsed.pickupLocationId
          ? String(parsed.pickupLocationId)
          : undefined,
        items: cartItems,
        savedAddressId: parsed.existingOrderId
          ? String(parsed.existingOrderId)
          : undefined,
      }).then((r) => ({
        success: true as const,
        isStripe: true,
        clientSecret: r.clientSecret,
        orderId: r.orderId,
        error: undefined as string | undefined,
      })).catch((err: unknown) => ({
        success: false as const,
        isStripe: false,
        clientSecret: undefined,
        orderId: undefined,
        error:
          err instanceof Error ? err.message : "Error al procesar el pedido.",
      }));

      if (res?.error) {
        localStorage.removeItem("checkout_session");
        toast.error(res.error);
        setIsPending(false);
        return;
      }

      if (res?.success && res.isStripe && res.clientSecret && res.orderId) {
        setStripeData({
          clientSecret: res.clientSecret,
          orderId: res.orderId,
        });

        localStorage.setItem(
          "checkout_session",
          JSON.stringify({
            orderId: res.orderId,
            timestamp: new Date().getTime(),
            cartFingerprint,
          }),
        );

        setIsAddressConfirmed(true);
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al iniciar el pago.");
    } finally {
      setIsPending(false);
      isSubmittingRef.current = false;
    }
  }, [items, shippingType, trigger, getValues, setValue]);

  const handleChangeAddress = () => {
    setIsAddressConfirmed(false);
    setStripeData(null);
    isSubmittingRef.current = false;
    stripeDataRef.current = null;
  };

  const autoConfirmAttempted = useRef(false);

  useEffect(() => {
    if (
      !autoConfirmAttempted.current &&
      savedAddresses?.some((a) => a.isDefault)
    ) {
      autoConfirmAttempted.current = true;
      handleConfirmAddress();
    }
  }, [savedAddresses]);

  const onValidSubmit = async (data: CreateOrderInput) => {};

  return {
    isPending,
    selectedAddressId,
    setSelectedAddressId,
    isAddressConfirmed,
    onConfirmAddress: handleConfirmAddress,
    onChangeAddress: handleChangeAddress,
    onCheckoutSubmit: handleSubmit(onValidSubmit),
    stripeData,
  };
}
