import * as z from "zod";

export const emailSchema = z
  .string()
  .min(1, "Introduce tu email")
  .email("Introduce un email válido");

export const passwordSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .regex(
    /^(?=.*[A-Za-z])(?=.*\d).+$/,
    "Debe incluir al menos una letra y un número",
  );

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Introduce tu contraseña"),
});

const phoneSchema = z
  .string()
  .min(6, "Teléfono inválido")
  .transform((s) => s.replace(/\s/g, ""))
  .refine((s) => /^\+?[\d]+$/.test(s), "Solo números");

export const registerSchema = z
  .object({
    firstName: z.string().min(2, "Mínimo 2 letras"),
    lastName: z.string().min(2, "Mínimo 2 letras"),
    phone: phoneSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });
