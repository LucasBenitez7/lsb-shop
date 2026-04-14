import Link from "next/link";
import {
  FaBoxOpen,
  FaCalendarDay,
  FaUser,
  FaLocationDot,
  FaCreditCard,
  FaCcVisa,
  FaCcMastercard,
  FaCcAmex,
  FaCcStripe,
  FaCcDiscover,
  FaRegCreditCard,
} from "react-icons/fa6";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Image } from "@/components/ui/image";

import { formatCurrency } from "@/lib/currency";

import type { OrderDisplayData } from "@/lib/orders/types";

export type OrderSummaryProps = Omit<
  OrderDisplayData,
  "items" | "paymentStatus" | "fulfillmentStatus" | "isCancelled" | "email"
> & {
  items: (OrderDisplayData["items"][number] & { badges?: React.ReactNode })[];
  variant?: "customer" | "admin";
  adminUserLink?: string;
};

function getPaymentBrandConfig(methodString: string | null) {
  if (!methodString)
    return {
      icon: FaRegCreditCard,
      color: "text-neutral-500",
      label: "Desconocido",
    };

  const lower = methodString.toLowerCase();

  if (lower.includes("visa"))
    return { icon: FaCcVisa, color: "text-blue-700", label: "Visa" };
  if (lower.includes("mastercard"))
    return {
      icon: FaCcMastercard,
      color: "text-orange-600",
      label: "Mastercard",
    };
  if (lower.includes("amex") || lower.includes("american express"))
    return { icon: FaCcAmex, color: "text-blue-500", label: "Amex" };
  if (lower.includes("discover"))
    return { icon: FaCcDiscover, color: "text-orange-500", label: "Discover" };
  if (lower.includes("stripe"))
    return { icon: FaCcStripe, color: "text-indigo-500", label: "Stripe" };

  // Default
  return { icon: FaCreditCard, color: "text-neutral-600", label: "Tarjeta" };
}

export function OrderSummaryCard({
  id,
  createdAt,
  paymentMethod,
  contact,
  shippingInfo,
  items,
  totals,
  currency = "EUR",
  variant = "customer",
  adminUserLink,
}: OrderSummaryProps) {
  const createdDateObj =
    typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const createdDateFormatted = createdDateObj.toLocaleString("es-ES", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const productLinkBase = variant === "admin" ? "/admin/products" : "/product";

  // Configuración dinámica del método de pago
  const { icon: PaymentIcon, color: paymentColor } =
    getPaymentBrandConfig(paymentMethod);

  return (
    <Card className="overflow-hidden border-neutral-200 shadow-sm px-4">
      <CardHeader className="pb-2 pt-4 border-b">
        <CardTitle className="text-lg font-bold flex flex-col sm:flex-row items-center justify-center gap-2 text-neutral-800">
          <span>Detalles del Pedido Nº </span>
          <span className="uppercase">{id}</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="grid space-y-6 py-6 pb-4 px-0 text-sm">
        {/* 1. INFO GENERAL (GRID 2 COLUMNAS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1">
            <h3 className="flex items-center gap-2 font-semibold text-sm uppercase text-foreground">
              <FaCalendarDay className="size-4" /> Realizado
            </h3>
            <p className="text-sm font-medium text-foreground">
              {createdDateFormatted}
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="flex items-center gap-2 font-semibold text-sm uppercase text-foreground">
              <FaCreditCard className="size-4" /> Método de pago
            </h3>
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <PaymentIcon className={`size-6 ${paymentColor}`} />
              <p>{paymentMethod}</p>
            </div>
          </div>
        </div>

        {/* 2. CONTACTO Y ENVÍO (GRID 2 COLUMNAS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* CONTACTO */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="flex items-center gap-2 font-semibold text-sm uppercase text-foreground">
                <FaUser className="size-4 mb-1" /> Datos de contacto
              </h3>
              {adminUserLink && (
                <Link
                  href={adminUserLink}
                  className="text-xs font-medium text-blue-600 underline underline-offset-2"
                >
                  Ver detalles del usuario
                </Link>
              )}
            </div>
            <div className="text-sm font-medium text-foreground">
              <p>{contact.name}</p>
              <p className="font-normal text-foreground">{contact.email}</p>
              <p className="font-normal text-foreground">
                {contact.phone || "Sin teléfono"}
              </p>
            </div>
          </div>

          {/* ENVÍO */}
          <div className="space-y-1">
            <h3 className="flex items-center gap-2 font-semibold text-sm uppercase text-foreground">
              <FaLocationDot className="size-4 mb-1" /> {shippingInfo.label}
            </h3>
            <div className="text-sm text-foreground">
              {shippingInfo.addressLines.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        </div>

        {/* 3. PRODUCTOS */}
        <div className="border-t pt-2 mb-2">
          <h3 className="text-lg my-3 font-semibold">
            Productos <span className="text-base">({items.length})</span>
          </h3>
          <ul className="space-y-0">
            {items.map((item) => (
              <li key={item.id} className="flex gap-3 py-2 items-start">
                <div className="relative aspect-[3/4] h-24 w-16 shrink-0 overflow-hidden rounded-xs bg-neutral-100 border">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="100px"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full w-full text-neutral-300">
                      <FaBoxOpen />
                    </div>
                  )}
                </div>

                {/* INFO */}
                <div className="flex flex-1 flex-col space-y-1">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <Link
                        href={`${productLinkBase}/${item.slug}`}
                        className="font-medium text-sm text-foreground hover:underline underline-offset-4 line-clamp-2"
                      >
                        {item.name}
                      </Link>
                      <p className="text-xs text-foreground font-medium mt-1">
                        {item.subtitle}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <div className="flex items-center gap-2">
                        {item.compareAtPrice &&
                          item.compareAtPrice > item.price && (
                            <p className="text-xs text-muted-foreground line-through tabular-nums">
                              {formatCurrency(
                                item.compareAtPrice * item.quantity,
                                currency,
                              )}
                            </p>
                          )}
                        <p
                          className={`font-semibold text-sm tabular-nums ${
                            item.compareAtPrice &&
                            item.compareAtPrice > item.price
                              ? "text-red-600"
                              : "text-foreground"
                          }`}
                        >
                          {formatCurrency(item.price * item.quantity, currency)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs flex flex-wrap gap-2 items-center justify-between pt-1">
                    <span className="text-foreground">X{item.quantity}</span>
                    {item.badges && (
                      <div className="flex gap-2">{item.badges}</div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* 4. TOTALES */}
        <div className="border-t border-neutral-200 pt-4 space-y-1 font-medium">
          <div className="flex justify-between text-sm text-foreground">
            <span>Subtotal</span>
            <span className="font-medium tabular-nums">
              {formatCurrency(
                (totals.totalDiscount ?? 0) > 0
                  ? totals.originalSubtotal!
                  : totals.subtotal,
                currency,
              )}
            </span>
          </div>

          {(totals.totalDiscount ?? 0) > 0 && (
            <div className="flex justify-between text-sm text-red-600">
              <span>Descuentos</span>
              <span className="font-medium tabular-nums">
                - {formatCurrency(totals.totalDiscount!, currency)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm text-foreground">
            <span>Envío</span>
            <span
              className={`font-medium tabular-nums ${
                totals.shipping === 0 ? "text-green-600" : ""
              }`}
            >
              {totals.shipping === 0
                ? "Gratis"
                : formatCurrency(totals.shipping, currency)}
            </span>
          </div>
          {totals.tax !== undefined && totals.tax > 0 && (
            <div className="flex justify-between text-sm text-neutral-600">
              <span>Impuestos</span>
              <span className="font-medium tabular-nums">
                {formatCurrency(totals.tax, currency)}
              </span>
            </div>
          )}
          {totals.refunded !== undefined && totals.refunded > 0 && (
            <div className="flex justify-between text-sm text-red-600">
              <span className="font-medium">Reembolsado</span>
              <span className="font-medium tabular-nums">
                - {formatCurrency(totals.refunded, currency)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold text-foreground pt-2 mt-2">
            <span>TOTAL</span>
            <span className="tabular-nums">
              {formatCurrency(totals.total, currency)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
