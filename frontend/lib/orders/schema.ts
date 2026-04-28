import { z } from "zod";

import { baseAddressSchema } from "@/lib/account/schema";

export const PAYMENT_METHODS = {
  card: "Tarjeta de Crédito / Débito",
  bizum: "Bizum",
  transfer: "Transferencia Bancaria",
  cash: "Contra Reembolso / Efectivo",
} as const;

export type PaymentMethodType = keyof typeof PAYMENT_METHODS;

const phoneRegex = /^[0-9+\s()-]{6,20}$/;
const requiredString = z.string().trim().min(1, "Campo requerido");

// --- 1. Schema de Items (Carrito) ---
export const orderItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  quantity: z.number().int().positive().max(100),
  priceCents: z.number().optional(),
});

// --- 2. Datos Base del Contacto ---
const baseOrderSchema = z.object({
  firstName: requiredString.min(2, "Mínimo 2 letras"),
  lastName: requiredString.min(2, "Mínimo 2 letras"),
  email: z.string().trim().email("Email inválido"),
  phone: z.string().regex(phoneRegex, "Teléfono inválido"),

  paymentMethod: z.enum(Object.keys(PAYMENT_METHODS) as [string, ...string[]], {
    message: "Selecciona un método de pago válido",
  }),

  cartItems: z.array(orderItemSchema).min(1, "El carrito está vacío"),
});

// --- 3. Opciones de Envío ---
const shippingSchema = z.discriminatedUnion("shippingType", [
  // A. DOMICILIO
  z.object({
    shippingType: z.literal("home"),
    firstName: baseAddressSchema.shape.firstName,
    lastName: baseAddressSchema.shape.lastName,
    phone: baseAddressSchema.shape.phone,
    street: baseAddressSchema.shape.street,
    postalCode: baseAddressSchema.shape.postalCode,
    city: baseAddressSchema.shape.city,
    province: baseAddressSchema.shape.province,
    country: baseAddressSchema.shape.country,
    details: baseAddressSchema.shape.details,

    isDefault: z.boolean().optional(),

    storeLocationId: z.null().optional(),
    pickupLocationId: z.null().optional(),
    pickupSearch: z.null().optional(),
  }),

  // B. RECOGIDA EN TIENDA
  z.object({
    shippingType: z.literal("store"),
    storeLocationId: requiredString,

    street: z.null().optional(),
    details: z.null().optional(),
    postalCode: z.null().optional(),
    city: z.null().optional(),
    province: z.null().optional(),
    country: z.null().optional(),
    isDefault: z.boolean().optional(),
    pickupLocationId: z.null().optional(),
    pickupSearch: z.null().optional(),
  }),

  // C. PUNTO DE RECOGIDA
  z.object({
    shippingType: z.literal("pickup"),
    pickupLocationId: requiredString,
    pickupSearch: z.string().optional(),

    storeLocationId: z.null().optional(),
    street: z.null().optional(),
    details: z.null().optional(),
    postalCode: z.null().optional(),
    city: z.null().optional(),
    province: z.null().optional(),
    country: z.null().optional(),
    isDefault: z.boolean().optional(),
  }),
]);

// --- 4. Schema Final ---
export const createOrderSchema = z.intersection(
  baseOrderSchema,
  shippingSchema,
);

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
