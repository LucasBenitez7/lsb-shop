"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button, Input, Label, PasswordInput } from "@/components/ui";

import { login, register, updateMe } from "@/lib/api/auth";
import { APIError } from "@/lib/api/client";
import { registerSchema } from "@/lib/auth/schema";

import { useAuth } from "./AuthProvider";
import { GoogleOAuthButton } from "./GoogleOAuthButton";

type Props = {
  redirectTo: string;
};

function registerErrorMessage(err: unknown): string {
  if (err instanceof APIError) {
    const d = err.detail;
    if (typeof d === "object" && d !== null) {
      const emailField = (d as Record<string, unknown>).email;
      if (Array.isArray(emailField) && typeof emailField[0] === "string") {
        return "Ya existe una cuenta con este email.";
      }
      if (typeof emailField === "string") {
        return "Ya existe una cuenta con este email.";
      }
    }
    return err.message;
  }
  return "Ha ocurrido un error inesperado.";
}

export function RegisterForm({ redirectTo }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectToParam = searchParams.get("redirectTo") ?? redirectTo;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const result = registerSchema.safeParse(data);

    if (!result.success) {
      const formattedErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          formattedErrors[String(issue.path[0])] = issue.message;
        }
      });
      setFieldErrors(formattedErrors);
      return;
    }

    setIsSubmitting(true);

    const email = result.data.email.toLowerCase();
    const password = result.data.password;

    let reg: Awaited<ReturnType<typeof register>>;
    try {
      reg = await register({
        email,
        password1: password,
        password2: result.data.confirmPassword,
        first_name: result.data.firstName.trim(),
        last_name: result.data.lastName.trim(),
        phone: result.data.phone.replace(/\s/g, ""),
      });
    } catch (err) {
      setFormError(registerErrorMessage(err));
      setIsSubmitting(false);
      return;
    }

    // Mandatory email verification: no JWT in response — login would fail until verified.
    if (typeof reg.access !== "string") {
      router.push("/auth/login?success=verify_email");
      setIsSubmitting(false);
      return;
    }

    try {
      await login({ email, password });
      try {
        await updateMe({
          first_name: result.data.firstName,
          last_name: result.data.lastName,
        });
      } catch {
        // Profile fields are optional for account creation; user can edit later.
      }
      await refresh();
      router.refresh();
      router.push(redirectToParam);
    } catch {
      router.push("/auth/login?success=registered");
    } finally {
      setIsSubmitting(false);
    }
  }

  const showGoogle =
    typeof process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID === "string" &&
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {showGoogle ? (
        <>
          <GoogleOAuthButton redirectTo={redirectToParam} />
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span>o con email</span>
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      ) : null}

      {/* GRID PARA NOMBRE Y APELLIDO EN UNA FILA */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="firstName">Nombre</Label>
          <Input
            id="firstName"
            name="firstName"
            autoComplete="given-name"
            aria-invalid={!!fieldErrors.firstName}
          />
          {fieldErrors.firstName && (
            <p className="text-xs text-red-600">{fieldErrors.firstName}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="lastName">Apellidos</Label>
          <Input
            id="lastName"
            name="lastName"
            autoComplete="family-name"
            aria-invalid={!!fieldErrors.lastName}
          />
          {fieldErrors.lastName && (
            <p className="text-xs text-red-600">{fieldErrors.lastName}</p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="phone">Teléfono</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          aria-invalid={!!fieldErrors.phone}
        />
        {fieldErrors.phone && (
          <p className="text-xs text-red-600">{fieldErrors.phone}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!fieldErrors.email}
        />
        {fieldErrors.email && (
          <p className="text-xs text-red-600">{fieldErrors.email}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="password">Contraseña</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          aria-invalid={!!fieldErrors.password}
        />
        {fieldErrors.password && (
          <p className="text-xs text-red-600">{fieldErrors.password}</p>
        )}
        <p className="text-[11px] text-muted-foreground">
          Mínimo 8 caracteres, letra y número.
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          aria-invalid={!!fieldErrors.confirmPassword}
        />
        {fieldErrors.confirmPassword && (
          <p className="text-xs text-red-600">{fieldErrors.confirmPassword}</p>
        )}
      </div>

      {formError && <p className="text-xs text-red-600">{formError}</p>}

      <Button type="submit" className="w-full h-10" disabled={isSubmitting}>
        {isSubmitting ? "Registrando..." : "Crear cuenta"}
      </Button>

      <p className="mt-2 text-xs text-foreground font-medium">
        ¿Ya tienes cuenta?{" "}
        <a
          href={`/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`}
          className="text-xs text-foreground hover:underline active:underline underline-offset-2"
        >
          Iniciar sesión
        </a>
      </p>
    </form>
  );
}
