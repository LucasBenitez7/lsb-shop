import { PaymentStatus, FulfillmentStatus, ShippingType } from "@/types/enums";
import type {
  Order,
  OrderDisplayData,
  OrderHistoryEntry,
  OrderItem,
  UserReturnableItem,
} from "@/types/order";
import {
  FaUser,
  FaUserShield,
  FaTriangleExclamation,
  FaCheck,
  FaBan,
} from "react-icons/fa6";

import {
  getShippingLabel,
  findStoreLocation,
  findPickupLocation,
} from "@/lib/locations";
import {
  SYSTEM_MSGS,
  PAYMENT_STATUS_CONFIG,
  FULFILLMENT_STATUS_CONFIG,
  SPECIAL_STATUS_CONFIG,
} from "@/lib/orders/constants";

const SYSTEM_REASON_MAP: Record<string, string> = {
  [SYSTEM_MSGS.RETURN_ACCEPTED]: "Reembolso procesado",
  [SYSTEM_MSGS.RETURN_PARTIAL_REJECTED]: "Reembolso (ítems rechazados)",
  [SYSTEM_MSGS.RETURN_REJECTED]: "Solicitud de devolución rechazada",
  [SYSTEM_MSGS.ORDER_CREATED]: "Pedido realizado con éxito",
  [SYSTEM_MSGS.CANCELLED_BY_USER]: "Cancelaste el pedido",
  [SYSTEM_MSGS.CANCELLED_BY_ADMIN]: "Cancelado por administración",
  [SYSTEM_MSGS.ORDER_EXPIRED]:
    "Expirado por falta de pago (Tiempo límite excedido)",
};

export function formatHistoryReason(reason: string | null | undefined) {
  if (!reason) return "Evento registrado";
  return SYSTEM_REASON_MAP[reason] || reason;
}

// Helper visual potente
export function getEventVisuals(
  actor: string,
  type: string,
  snapshotStatus: string,
) {
  const actorLower = actor.toLowerCase();
  const isSystemOrAdmin =
    actorLower.includes("admin") || actorLower.includes("system");
  const isIncident = type === "INCIDENT";

  // 1. Configuración del ACTOR (Quién lo hizo)
  const actorConfig = isSystemOrAdmin
    ? {
        bg: "bg-orange-100",
        text: "text-orange-700",
        border: "border-orange-200",
        icon: FaUserShield,
        label: "Soporte / Sistema",
        cardBorder: "border-orange-200/60 bg-orange-50",
      }
    : {
        bg: "bg-blue-100",
        text: "text-blue-700",
        border: "border-blue-200",
        icon: FaUser,
        label: "Cliente",
        cardBorder: "border-blue-200/60 bg-blue-50",
      };

  let statusIcon = null;
  let statusColor = "text-neutral-600";

  if (isIncident) {
    statusIcon = FaTriangleExclamation;
    statusColor = "text-red-600";

    if (
      snapshotStatus.includes("Completada") ||
      snapshotStatus.includes("Aceptada")
    ) {
      statusIcon = FaCheck;
      statusColor = "text-green-600";
    } else if (snapshotStatus.includes("Rechazada")) {
      statusIcon = FaBan;
      statusColor = "text-red-600";
    }
  } else {
    const paymentMatch = Object.values(PAYMENT_STATUS_CONFIG).find(
      (c) => c.label === snapshotStatus,
    );
    const fulfillMatch = Object.values(FULFILLMENT_STATUS_CONFIG).find(
      (c) => c.label === snapshotStatus,
    );

    if (paymentMatch) {
      statusColor = paymentMatch.color.replace("bg-", "text-");
    } else if (fulfillMatch) {
      statusColor = fulfillMatch.color.replace("bg-", "text-");
    }
  }

  return {
    actorConfig,
    isIncident,
    isAdmin: isSystemOrAdmin,
    statusIcon,
    statusColor,
  };
}

export function getOrderCancellationDetails(order: any) {
  if (!order.isCancelled) return null;

  // 1. Buscamos el evento de cierre
  const stopEvent = order.history.find(
    (h: any) =>
      h.snapshotStatus === SPECIAL_STATUS_CONFIG.CANCELLED.label ||
      h.snapshotStatus === SPECIAL_STATUS_CONFIG.EXPIRED.label,
  );

  // 2. Determinamos si es expirado
  const isExpired =
    stopEvent?.snapshotStatus === SPECIAL_STATUS_CONFIG.EXPIRED.label;

  // 3. Calculamos Títulos y Actores
  let bannerTitle = "";

  if (isExpired) {
    bannerTitle = "El pedido ha expirado";
  } else {
    const isUser = stopEvent?.actor === "user";
    const actorLabel = isUser ? "el Cliente" : "Administración";
    bannerTitle = `Pedido cancelado por ${actorLabel}`;
  }

  return {
    isExpired,
    bannerTitle,
    stopReason: stopEvent
      ? formatHistoryReason(stopEvent.reason)
      : "Motivo no especificado",
    stopDate: stopEvent ? stopEvent.createdAt : null,
  };
}

export function getOrderCancellationDetailsUser(order: any) {
  if (!order.isCancelled) return null;

  // 1. Buscamos el evento de cierre
  const stopEvent = order.history.find(
    (h: any) =>
      h.snapshotStatus === SPECIAL_STATUS_CONFIG.CANCELLED.label ||
      h.snapshotStatus === SPECIAL_STATUS_CONFIG.EXPIRED.label,
  );

  // 2. Determinamos si es expirado
  const isExpired =
    stopEvent?.snapshotStatus === SPECIAL_STATUS_CONFIG.EXPIRED.label;

  // 3. Calculamos Títulos y Actores
  let bannerTitle = "";

  if (isExpired) {
    bannerTitle = "El pedido ha expirado";
  } else {
    const isUser = stopEvent?.actor === "user";
    bannerTitle = isUser
      ? "Has cancelado este pedido"
      : "Pedido cancelado por el administrador";
  }

  return {
    isExpired,
    bannerTitle,
    stopReason: stopEvent
      ? formatHistoryReason(stopEvent.reason)
      : "Motivo no especificado",
    stopDate: stopEvent ? stopEvent.createdAt : null,
  };
}

export function getOrderShippingDetails(order: Order) {
  const label = getShippingLabel(order.shippingType?.toLowerCase());
  let lines: string[] = [];

  if (order.shippingType === ShippingType.HOME) {
    const line1 = [order.street, order.addressExtra].filter(Boolean).join(", ");
    const line2 = [order.postalCode, order.city, order.province, order.country]
      .filter(Boolean)
      .join(", ");
    lines = [line1, line2];
  } else if (order.shippingType === ShippingType.STORE) {
    const store = findStoreLocation(order.storeLocationId);
    lines = [
      "Tienda seleccionada:",
      store ? store.name : order.storeLocationId || "Ubicación desconocida",
      store ? store.addressLine1 : "",
    ];
  } else if (order.shippingType === ShippingType.PICKUP) {
    const pickup = findPickupLocation(order.pickupLocationId);
    lines = [
      "Punto de entrega:",
      pickup
        ? pickup.name
        : order.pickupSearch || order.pickupLocationId || "Sin información",
    ];
  }
  return { label, addressLines: lines.filter(Boolean) };
}

export type OrderWithDetails = Order & {
  items: (OrderItem & {
    product: {
      slug: string;
      compareAtPrice: number | null;
      images: { url: string; color: string | null }[];
    };
  })[];
  history?: any[]; // Flexible for now
};

/** Order shape for success / account summary when line items may lack linked product. */
export type OrderForDisplayInput = Order & {
  items: OrderItem[];
  history?: OrderHistoryEntry[];
};

export function canOrderBeReturned(order: {
  paymentStatus: string;
  fulfillmentStatus: string;
  isCancelled: boolean;
}) {
  return (
    !order.isCancelled &&
    order.paymentStatus === "PAID" &&
    order.fulfillmentStatus === "DELIVERED"
  );
}

export function shouldShowHistoryButton(order: {
  paymentStatus: string;
  returnReason?: string | null;
  history?: any[];
  isCancelled: boolean;
}) {
  const hasRefunds =
    order.paymentStatus === "REFUNDED" ||
    order.paymentStatus === "PARTIALLY_REFUNDED";

  const hasActiveReturn = !!order.returnReason;
  const hasIncidents = order.history?.some((h: any) => h.type === "INCIDENT");

  return hasRefunds || hasActiveReturn || (hasIncidents && !order.isCancelled);
}

export function getOrderTotals(order: OrderWithDetails) {
  const originalSubtotal = calculateDiscounts(order.items);
  const totalDiscount = originalSubtotal - order.itemsTotalMinor;

  let refundedAmountMinor = order.items.reduce(
    (acc, item) => acc + item.priceMinorSnapshot * item.quantityReturned,
    0,
  );
  if (order.paymentStatus === "REFUNDED" && refundedAmountMinor === 0) {
    refundedAmountMinor = order.totalMinor;
  }
  const netTotalMinor = order.totalMinor - refundedAmountMinor;

  return {
    originalSubtotal,
    totalDiscount,
    refundedAmountMinor,
    netTotalMinor,
  };
}

export function getReturnableItems(
  order: OrderWithDetails,
): UserReturnableItem[] {
  return order.items
    .map((item): UserReturnableItem | null => {
      const productImages = item.product?.images || [];
      const matchingImg =
        productImages.find((img) => img.color === item.colorSnapshot) ||
        productImages[0];

      const maxReturnable =
        item.quantity - item.quantityReturned - item.quantityReturnRequested;

      if (maxReturnable <= 0) return null;

      return {
        id: item.id,
        nameSnapshot: item.nameSnapshot,
        sizeSnapshot: item.sizeSnapshot,
        colorSnapshot: item.colorSnapshot,
        maxQuantity: maxReturnable,
        image: matchingImg?.url ?? undefined,
      };
    })
    .filter((item): item is UserReturnableItem => item !== null);
}

export function calculateDiscounts(
  items: {
    priceMinorSnapshot: number;
    quantity: number;
    product?: { compareAtPrice?: number | null } | null;
  }[],
) {
  let originalSubtotal = 0;
  items.forEach((item) => {
    const comparePrice = item.product?.compareAtPrice;
    const price = item.priceMinorSnapshot;
    const finalPrice =
      comparePrice && comparePrice > price ? comparePrice : price;
    originalSubtotal += finalPrice * item.quantity;
  });
  return originalSubtotal;
}

export function formatOrderForDisplay(
  order: OrderForDisplayInput,
): OrderDisplayData {
  const originalSubtotal = calculateDiscounts(order.items);
  const totalDiscount = originalSubtotal - order.itemsTotalMinor;

  return {
    id: order.id,
    userId: order.userId,
    email: order.email,
    createdAt: order.createdAt,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    isCancelled: order.isCancelled,
    currency: order.currency,
    paymentMethod: order.paymentMethod,
    totals: {
      subtotal: order.itemsTotalMinor,
      shipping: order.shippingCostMinor,
      tax: order.taxMinor,
      total: order.totalMinor,
      originalSubtotal,
      totalDiscount: totalDiscount > 0 ? totalDiscount : 0,
    },
    shippingInfo: getOrderShippingDetails(order),
    contact: {
      name: `${order.firstName || ""} ${order.lastName || ""}`.trim(),
      phone: order.phone || "",
      email: order.email,
    },
    items: order.items.map((item) => {
      const purchasedColor = item.colorSnapshot;
      const product = item.product;
      const allImages = product?.images ?? [];
      const matchingImage = allImages.find(
        (img) => img.color === purchasedColor,
      );
      const finalImageUrl = matchingImage?.url || allImages[0]?.url || null;

      return {
        id: item.id,
        name: item.nameSnapshot,
        slug: product?.slug ?? "",
        subtitle: [item.sizeSnapshot, item.colorSnapshot]
          .filter(Boolean)
          .join(" / "),
        quantity: item.quantity,
        price: item.priceMinorSnapshot,
        compareAtPrice: product?.compareAtPrice ?? undefined,
        image: finalImageUrl,
      };
    }),
  };
}

export type DisplayOrder = OrderDisplayData;

export function getReturnStatusBadge(order: {
  paymentStatus: string;
  fulfillmentStatus: string;
  history?: { snapshotStatus: string }[];
}) {
  if (
    order.paymentStatus === PaymentStatus.REFUNDED ||
    order.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED
  ) {
    return {
      label: "Reembolsado",
      badgeClass: "bg-purple-100 text-purple-700 border-purple-200",
    };
  }

  if (order.fulfillmentStatus === FulfillmentStatus.RETURNED) {
    return {
      label: "Devuelto",
      badgeClass: "bg-indigo-100 text-indigo-700 border-indigo-200",
    };
  }

  const history = order.history || [];
  const hasRequest = history.some(
    (h) => h.snapshotStatus === SYSTEM_MSGS.RETURN_REQUESTED,
  );
  const isClosed = history.some(
    (h) =>
      h.snapshotStatus === "Devolución Completada" ||
      h.snapshotStatus === "Devolución Aceptada" ||
      h.snapshotStatus === "Solicitud Rechazada" ||
      h.snapshotStatus === "Solicitud Rechazada (Parcial)",
  );

  if (hasRequest && !isClosed) {
    return {
      label: "Solicitud Pendiente",
      badgeClass:
        "bg-orange-100 text-orange-700 border-orange-200 font-semibold",
    };
  }

  return null;
}
