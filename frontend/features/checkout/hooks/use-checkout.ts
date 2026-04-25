"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";

import { createOrder as _createOrder } from "@/lib/api/orders";
import {
  getOrderSuccessDetails,
  getPaymentIntent,
} from "@/lib/api/account";
import { buildCheckoutSuccessHref } from "@/lib/checkout/stripe-return-paths";
import { useCartStore } from "@/store/useCartStore";

const readCartFingerprint = () => {
  const cartItems = useCartStore.getState().items;
  const fresh = cartItems.map((item) => ({
    productId: item.productId,
    variantId: item.variantId,
    quantity: item.quantity,
    priceCents: item.price,
  }));
  return JSON.stringify(
    [...fresh].sort((a, b) => a.variantId.localeCompare(b.variantId)),
  );
};

import type { CreateOrderInput } from "@/lib/orders/schema";
import type { UserAddress } from "@/types/address";

export type CheckoutPaymentResume = {
  orderId: string;
  paymentIntent?: string;
  redirectStatus?: string;
};

/** Error strip after Stripe redirect (failed payment or cannot load session). */
export type CheckoutPaymentReturnBanner = {
  variant: "destructive";
  title: string;
  description?: string;
  orderId: string;
};

/** Stripe redirect OK but order not PAID in DB yet — hide card form, poll / manual refresh. */
export type CheckoutPaymentAwaitingDbSync = {
  orderId: string;
  paymentIntentHint?: string;
};

export function useCheckout(
  savedAddresses: UserAddress[],
  paymentResume?: CheckoutPaymentResume | null,
) {
  const router = useRouter();
  const items = useCartStore((state) => state.items);

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

  const [paymentReturnBanner, setPaymentReturnBanner] =
    useState<CheckoutPaymentReturnBanner | null>(null);
  const [paymentIntentRetrying, setPaymentIntentRetrying] = useState(false);
  const [paymentAwaitingDbSync, setPaymentAwaitingDbSync] =
    useState<CheckoutPaymentAwaitingDbSync | null>(null);
  const [paymentCompletingAfterStripe, setPaymentCompletingAfterStripe] =
    useState(false);
  const [refreshOrderStatusBusy, setRefreshOrderStatusBusy] = useState(false);

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
      priceCents: item.price,
    }));
    setValue("cartItems", formItems);
  }, [items, setValue]);

  const tryFinalizePaidOrder = useCallback(
    async (ctx: CheckoutPaymentAwaitingDbSync) => {
      const o = await getOrderSuccessDetails(
        ctx.orderId,
        ctx.paymentIntentHint,
      );
      if (o?.paymentStatus === "PAID") {
        setPaymentAwaitingDbSync(null);
        setPaymentReturnBanner(null);
        toast.success("Pago confirmado.");
        router.push(
          buildCheckoutSuccessHref(ctx.orderId, ctx.paymentIntentHint),
        );
        return true;
      }
      return false;
    },
    [router],
  );

  const pollAwaitingIvRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  useEffect(() => {
    if (!paymentAwaitingDbSync) return;
    const ctx = { ...paymentAwaitingDbSync };
    let cancelled = false;
    let n = 0;
    const maxPolls = 20;

    void (async () => {
      const done = await tryFinalizePaidOrder(ctx);
      if (done || cancelled) return;
      pollAwaitingIvRef.current = setInterval(async () => {
        if (cancelled) return;
        n += 1;
        const d = await tryFinalizePaidOrder(ctx);
        if (d || n >= maxPolls) {
          if (pollAwaitingIvRef.current) {
            clearInterval(pollAwaitingIvRef.current);
            pollAwaitingIvRef.current = null;
          }
        }
      }, 2500);
    })();

    return () => {
      cancelled = true;
      if (pollAwaitingIvRef.current) {
        clearInterval(pollAwaitingIvRef.current);
        pollAwaitingIvRef.current = null;
      }
    };
  }, [paymentAwaitingDbSync, tryFinalizePaidOrder]);

  const refreshOrderPaymentStatus = useCallback(async () => {
    if (!paymentAwaitingDbSync) return;
    setRefreshOrderStatusBusy(true);
    try {
      await tryFinalizePaidOrder(paymentAwaitingDbSync);
    } finally {
      setRefreshOrderStatusBusy(false);
    }
  }, [paymentAwaitingDbSync, tryFinalizePaidOrder]);

  const resumeHandledKey = useRef<string | null>(null);

  useEffect(() => {
    if (!paymentResume?.orderId) return;

    const key = [
      paymentResume.orderId,
      paymentResume.paymentIntent ?? "",
      paymentResume.redirectStatus ?? "",
    ].join("|");

    if (resumeHandledKey.current === key) return;
    resumeHandledKey.current = key;

    let cancelled = false;
    const { orderId, paymentIntent, redirectStatus } = paymentResume;

    void (async () => {
      if (redirectStatus && redirectStatus !== "succeeded") {
        setIsAddressConfirmed(true);
        setPaymentReturnBanner({
          variant: "destructive",
          title: "El pago no se completó",
          description:
            "Stripe no confirmó el cobro. Revisa los datos de la tarjeta o prueba con otro método, y vuelve a intentarlo.",
          orderId,
        });
        const res = await getPaymentIntent(orderId);
        if (cancelled) return;
        if (res.clientSecret && !res.error) {
          setPaymentReturnBanner(null);
          setStripeData({ clientSecret: res.clientSecret, orderId });
          setIsAddressConfirmed(true);
        } else if (res.error) {
          setPaymentReturnBanner({
            variant: "destructive",
            title: "No se pudo preparar el pago",
            description: res.error,
            orderId,
          });
        }
        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", "/checkout");
        }
        return;
      }

      const order = await getOrderSuccessDetails(orderId, paymentIntent);
      if (cancelled) return;

      if (!order) {
        setIsAddressConfirmed(true);
        setPaymentReturnBanner({
          variant: "destructive",
          title: "No se encontró el pedido",
          description:
            "No pudimos cargar tu pedido. Vuelve a la lista de pedidos o inicia un checkout nuevo.",
          orderId,
        });
        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", "/checkout");
        }
        return;
      }

      if (order.paymentStatus === "PAID") {
        setPaymentReturnBanner(null);
        toast.success("Pago confirmado.");
        router.push(buildCheckoutSuccessHref(orderId, paymentIntent));
        return;
      }

      if (redirectStatus === "succeeded") {
        setPaymentReturnBanner(null);
        setStripeData(null);
        setIsAddressConfirmed(true);
        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", "/checkout");
        }

        const ctx: CheckoutPaymentAwaitingDbSync = {
          orderId,
          paymentIntentHint: paymentIntent,
        };
        setPaymentCompletingAfterStripe(true);
        void (async () => {
          const sleep = (ms: number) =>
            new Promise<void>((resolve) => {
              setTimeout(resolve, ms);
            });

          if (await tryFinalizePaidOrder(ctx)) {
            setPaymentCompletingAfterStripe(false);
            return;
          }

          const deadline = Date.now() + 5000;
          while (!cancelled && Date.now() < deadline) {
            await sleep(400);
            if (cancelled) break;
            if (await tryFinalizePaidOrder(ctx)) {
              setPaymentCompletingAfterStripe(false);
              return;
            }
          }

          if (cancelled) {
            setPaymentCompletingAfterStripe(false);
            return;
          }

          setPaymentCompletingAfterStripe(false);
          setPaymentAwaitingDbSync(ctx);
        })();
        return;
      }

      const res = await getPaymentIntent(orderId);
      if (cancelled) return;

      if (res.error || !res.clientSecret) {
        setPaymentReturnBanner({
          variant: "destructive",
          title: "No se pudo cargar la pasarela de pago",
          description:
            res.error ||
            "Inténtalo de nuevo con el botón «Cargar de nuevo» o recarga la página.",
          orderId,
        });
        setIsAddressConfirmed(true);
        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", "/checkout");
        }
        return;
      }

      setPaymentReturnBanner(null);
      setStripeData({ clientSecret: res.clientSecret, orderId });
      setIsAddressConfirmed(true);

      const cartFingerprint = readCartFingerprint();

      localStorage.setItem(
        "checkout_session",
        JSON.stringify({
          orderId,
          timestamp: Date.now(),
          cartFingerprint,
        }),
      );

      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", "/checkout");
      }
    })();

    return () => {
      cancelled = true;
      resumeHandledKey.current = null;
    };
  }, [
    paymentResume?.orderId,
    paymentResume?.paymentIntent,
    paymentResume?.redirectStatus,
    router,
    tryFinalizePaidOrder,
  ]);

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
      isSubmittingRef.current = false;
      return;
    }

    if (items.length === 0) {
      toast.error("Tu carrito está vacío.");
      isSubmittingRef.current = false;
      return;
    }

    setIsPending(true);

    const currentData = getValues();
    currentData.paymentMethod = "card";

    const freshCartItems = items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      priceCents: item.price,
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

    const savedSession = localStorage.getItem("checkout_session");
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        const sessionFingerprint = parsed.cartFingerprint ?? null;
        const cartUnchanged = sessionFingerprint === cartFingerprint;
        if (!cartUnchanged) {
          localStorage.removeItem("checkout_session");
        }
      } catch {
        localStorage.removeItem("checkout_session");
      }
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
        toast.error(res.error, { duration: 8000 });
        setIsPending(false);
        return;
      }

      if (res?.success && res.isStripe && res.clientSecret && res.orderId) {
        // Block a second concurrent createOrder before React commits `stripeData` state.
        stripeDataRef.current = {
          clientSecret: res.clientSecret,
          orderId: res.orderId,
        };
        setPaymentAwaitingDbSync(null);
        setPaymentReturnBanner(null);
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
    setPaymentReturnBanner(null);
    setPaymentAwaitingDbSync(null);
    setPaymentCompletingAfterStripe(false);
    isSubmittingRef.current = false;
    stripeDataRef.current = null;
  };

  const dismissPaymentReturnBanner = useCallback(() => {
    setPaymentReturnBanner(null);
  }, []);

  const retryCheckoutPaymentIntent = useCallback(async () => {
    const orderId = paymentReturnBanner?.orderId;
    if (!orderId) return;
    setPaymentIntentRetrying(true);
    const res = await getPaymentIntent(orderId);
    if (res.clientSecret && !res.error) {
      setPaymentReturnBanner(null);
      setStripeData({ clientSecret: res.clientSecret, orderId });
      setIsAddressConfirmed(true);
    } else {
      toast.error(res.error || "No se pudo cargar la sesión de pago.");
    }
    setPaymentIntentRetrying(false);
  }, [paymentReturnBanner?.orderId]);

  const autoConfirmAttempted = useRef(false);

  useEffect(() => {
    if (paymentResume?.orderId) {
      autoConfirmAttempted.current = true;
      return;
    }
    if (
      !autoConfirmAttempted.current &&
      savedAddresses?.some((a) => a.isDefault)
    ) {
      autoConfirmAttempted.current = true;
      handleConfirmAddress();
    }
  }, [savedAddresses, paymentResume?.orderId]);

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
    paymentReturnBanner,
    dismissPaymentReturnBanner,
    retryCheckoutPaymentIntent,
    paymentIntentRetrying,
    paymentAwaitingDbSync,
    paymentCompletingAfterStripe,
    refreshOrderPaymentStatus,
    refreshOrderStatusBusy,
  };
}
