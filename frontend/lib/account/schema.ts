import { z } from "zod";

import { passwordSchema } from "@/lib/auth/schema";

export const phoneRegex = /^[0-9+\s]+$/;
export const postalCodeRegex = /^\d{5}$/;

// 0. Security Schema
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Introduce tu contraseña actual"),
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1, "Confirma la nueva contraseña"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmNewPassword"],
  });

// 1. Schema BASE
export const baseAddressSchema = z.object({
  firstName: z.string().trim().min(2, "Mínimo 2 letras"),
  lastName: z.string().trim().min(2, "Mínimo 2 letras"),
  phone: z
    .string()
    .trim()
    .min(6, "Teléfono inválido")
    .regex(phoneRegex, "Introduce solo números"),

  street: z.string().trim().min(5, "Dirección muy corta"),

  details: z
    .string()
    .trim()
    .min(1, "Indica piso, puerta o referencias de entrega"),

  postalCode: z
    .string()
    .trim()
    .regex(postalCodeRegex, "CP inválido (5 dígitos)"),
  city: z.string().trim().min(2, "Indica la ciudad"),
  province: z.string().trim().min(2, "Indica la provincia"),
  country: z
    .string()
    .trim()
    .length(2, "Código de país inválido (ISO-2)")
    .toUpperCase()
    .default("ES"),
});

export const addressFormSchema = baseAddressSchema.extend({
  id: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export type BaseAddressValues = z.infer<typeof baseAddressSchema>;
export type AddressFormValues = z.infer<typeof addressFormSchema>;

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
