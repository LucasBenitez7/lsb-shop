import { PaymentStatus, type FulfillmentStatus } from "@/types/enums";

// 1. MENSAJES DEL SISTEMA (LOGS E HISTORIAL)
export const SYSTEM_MSGS = {
  ORDER_CREATED: "Creación del pedido",

  // Devoluciones
  RETURN_REQUESTED: "Solicitud de Devolución",
  RETURN_ACCEPTED: "Devolución procesada y stock restaurado",
  RETURN_PARTIAL_ACCEPTED: "Devolución Aceptada",
  RETURN_PARTIAL_REJECTED: "Parte de la solicitud no fue aceptada",
  RETURN_REJECTED: "La solicitud de devolución ha sido denegada",

  // Cancelaciones y Expiraciones
  CANCELLED_BY_USER: "Cancelado por cliente",
  CANCELLED_BY_ADMIN: "Cancelado por Admin",
  CANCELLED_BY_ADMIN_REFUND:
    "Cancelado por Admin (Stock devuelto y Reembolso aplicado)",
  ORDER_EXPIRED: "El plazo de pago del pedido ha expirado",
} as const;

export type SystemMessageType = (typeof SYSTEM_MSGS)[keyof typeof SYSTEM_MSGS];

// 2. CONFIGURACIÓN VISUAL (BADGES, COLORES, LABELS)
// --- A. ESTADOS DE PAGO (Dinero) ---
export const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; color: string; badge: string }
> = {
  PENDING: {
    label: "Pendiente de pago",
    color: "bg-yellow-500",
    badge: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  PAID: {
    label: "Pagado",
    color: "bg-green-500",
    badge: "bg-green-100 text-green-700 border-green-200",
  },
  REFUNDED: {
    label: "Reembolso completo",
    color: "bg-orange-600",
    badge: "bg-orange-100 text-orange-700 border-orange-200",
  },
  PARTIALLY_REFUNDED: {
    label: "Reembolso",
    color: "bg-orange-500",
    badge: "bg-orange-100 text-orange-800 border-orange-200",
  },
  FAILED: {
    label: "Pago Fallido",
    color: "bg-red-600",
    badge: "bg-red-100 text-red-700 border-red-200",
  },
};

// --- B. ESTADOS DE LOGÍSTICA (Caja) ---
export const FULFILLMENT_STATUS_CONFIG: Record<
  FulfillmentStatus,
  { label: string; color: string; badge: string }
> = {
  UNFULFILLED: {
    label: "Procesando",
    color: "bg-neutral-400",
    badge: "bg-neutral-100 text-neutral-600 border-neutral-200",
  },
  PREPARING: {
    label: "Preparando pedido",
    color: "bg-blue-500",
    badge: "bg-blue-100 text-blue-700 border-blue-200",
  },
  READY_FOR_PICKUP: {
    label: "Listo para recoger",
    color: "bg-indigo-500",
    badge: "bg-indigo-100 text-indigo-700 border-indigo-200",
  },
  SHIPPED: {
    label: "Enviado",
    color: "bg-indigo-500",
    badge: "bg-indigo-100 text-indigo-700 border-indigo-200",
  },
  DELIVERED: {
    label: "Entregado",
    color: "bg-emerald-600",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  RETURNED: {
    label: "Reembolsos",
    color: "bg-purple-600",
    badge: "bg-purple-100 text-purple-700 border-purple-200",
  },
};

// --- C. ESTADOS ESPECIALES (Cancelado / Expirado) ---
export const SPECIAL_STATUS_CONFIG = {
  CANCELLED: {
    label: "Cancelado",
    color: "bg-red-500",
    badge: "bg-red-50 text-red-700 border-red-200",
  },
  EXPIRED: {
    label: "Expirado",
    color: "bg-stone-500",
    badge: "bg-stone-100 text-stone-700 border-stone-200",
  },
} as const;

// 3. UI HELPERS & FILTROS
export const ORDER_TABS = [
  { label: "Todos", value: undefined },
  { label: "Pendientes de Pago", value: "PENDING_PAYMENT" },
  { label: "En Proceso", value: "ACTIVE" },
  { label: "Entregados", value: "COMPLETED" },
  { label: "Devoluciones / Reembolsos", value: "RETURNS" },
  { label: "Expirados", value: "EXPIRED" },
  { label: "Cancelados", value: "CANCELLED" },
] as const;

export const ADMIN_FILTER_PAYMENT = Object.entries(PAYMENT_STATUS_CONFIG)
  .filter(
    ([status]) =>
      !["REFUNDED", "PARTIALLY_REFUNDED", "PENDING"].includes(status),
  )
  .map(([value, config]) => ({
    value,
    label: config.label,
    color: config.color,
  }));

export const ADMIN_FILTER_FULFILLMENT = Object.entries(
  FULFILLMENT_STATUS_CONFIG,
)
  .filter(([status]) => status !== "RETURNED")
  .map(([value, config]) => ({
    value,
    label: config.label,
    color: config.color,
  }));

// Helper para determinar qué badge mostrar al usuario en la tarjeta
export function getUserDisplayStatus(order: {
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  isCancelled: boolean;
}) {
  // 1. Prioridad: Cancelado
  if (order.isCancelled) {
    return SPECIAL_STATUS_CONFIG.CANCELLED;
  }

  // 2. Prioridad: Problemas de Pago o Reembolsos
  if (
    order.paymentStatus === PaymentStatus.REFUNDED ||
    order.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED ||
    order.paymentStatus === PaymentStatus.FAILED
  ) {
    return PAYMENT_STATUS_CONFIG[order.paymentStatus];
  }

  // 3. Prioridad: Pendiente de Pago
  if (order.paymentStatus === PaymentStatus.PENDING) {
    return PAYMENT_STATUS_CONFIG.PENDING;
  }

  // 4. Por defecto: Estado Logístico
  return FULFILLMENT_STATUS_CONFIG[order.fulfillmentStatus];
}

// Opciones de Ordenamiento
export const ORDER_SORT_OPTIONS = [
  { label: "Más recientes", value: "date_desc" },
  { label: "Más antiguos", value: "date_asc" },
  { label: "Total mayor a menor", value: "total_desc" },
  { label: "Total menor a mayor", value: "total_asc" },
  { label: "Cliente (A-Z)", value: "customer_asc" },
  { label: "Cliente (Z-A)", value: "customer_desc" },
];

// Listas de Motivos
export const RETURN_REASONS = [
  "No me queda bien la talla",
  "El producto es diferente a la foto",
  "Llegó dañado o defectuoso",
  "Me equivoqué al pedirlo",
  "Ya no lo quiero",
  "Otro motivo",
];

export const REJECTION_REASONS = [
  "El producto está usado o sin etiquetas",
  "Fuera del plazo de devolución",
  "No se aprecian los daños mencionados",
  "El producto no corresponde con el pedido original",
  "Otro motivo",
];
