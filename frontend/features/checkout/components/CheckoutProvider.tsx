"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type ReactNode, useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { createOrderSchema, type CreateOrderInput } from "@/lib/orders/schema";

type Props = {
  children: ReactNode;
  defaultValues?: Partial<CreateOrderInput>;
};

export function CheckoutProvider({ children, defaultValues }: Props) {
  const initialValues: CreateOrderInput = useMemo(() => {
    const safeDefaults = defaultValues || {};

    const baseValues = {
      email: defaultValues?.email ?? "",
      firstName: defaultValues?.firstName ?? "",
      lastName: defaultValues?.lastName ?? "",
      phone: defaultValues?.phone ?? "",
      paymentMethod: defaultValues?.paymentMethod ?? "card",
      cartItems: defaultValues?.cartItems ?? [],
    };

    const shippingType = defaultValues?.shippingType ?? "home";

    if (shippingType === "store") {
      return {
        ...baseValues,
        shippingType: "store",
        storeLocationId: defaultValues?.storeLocationId ?? "",
        street: null,
        city: null,
        province: null,
        postalCode: null,
        addressExtra: null,
        country: null,
        pickupLocationId: null,
        pickupSearch: null,
      };
    }

    if (shippingType === "pickup") {
      return {
        ...baseValues,
        shippingType: "pickup",
        pickupLocationId: defaultValues?.pickupLocationId ?? "",
        pickupSearch: defaultValues?.pickupSearch ?? "",
        street: null,
        city: null,
        province: null,
        postalCode: null,
        details: null,
        country: null,
        storeLocationId: null,
      };
    }

    return {
      ...baseValues,
      shippingType: "home",
      street: defaultValues?.street ?? "",
      city: defaultValues?.city ?? "",
      province: defaultValues?.province ?? "",
      postalCode: defaultValues?.postalCode ?? "",
      details: defaultValues?.details ?? "",
      country: defaultValues?.country ?? "España",
      storeLocationId: null,
      pickupLocationId: null,
      pickupSearch: null,
    };
  }, [defaultValues]);

  const methods = useForm<CreateOrderInput>({
    resolver: zodResolver(createOrderSchema) as any,
    defaultValues: initialValues,
    mode: "onBlur",
  });

  return <FormProvider {...methods}>{children}</FormProvider>;
}
