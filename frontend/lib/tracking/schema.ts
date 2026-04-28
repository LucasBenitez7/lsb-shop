import { z } from "zod";

export const guestAccessStep1Schema = z.object({
  orderId: z
    .string()
    .min(1, "El número de pedido es obligatorio")
    .transform((s) => s.trim().replace(/^#/, ""))
    .refine((s) => /^\d+$/.test(s), {
      message: "El número de pedido solo puede contener dígitos.",
    }),
  email: z
    .string()
    .min(1, "El email es obligatorio")
    .email("Introduce un email válido")
    .transform((s) => s.trim().toLowerCase()),
});

export const guestAccessStep2Schema = z.object({
  otp: z.string().length(6, "El código debe tener 6 dígitos"),
});

export type GuestAccessStep1Values = z.infer<typeof guestAccessStep1Schema>;
export type GuestAccessStep2Values = z.infer<typeof guestAccessStep2Schema>;
