"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { type FormEvent, useState } from "react"

import { Button, Input, Label, PasswordInput } from "@/components/ui"

import { login } from "@/lib/api/auth"
import { APIError } from "@/lib/api/client"
import {
  GUEST_CHECKOUT_HREF,
  isCheckoutGuestEntryRedirect,
} from "@/lib/auth/guest-checkout"
import { loginSchema } from "@/lib/auth/schema"

import { useAuth } from "./AuthProvider"
import { GoogleOAuthButton } from "./GoogleOAuthButton"

type LoginFormProps = {
  redirectTo: string
}

const LOGIN_WRONG_CREDENTIALS = "Email o contraseña no coinciden."

/** Map dj-rest-auth / Django i18n messages to clear Spanish copy (same UX for 400 and 401). */
function mapLoginApiErrorMessage(apiMessage: string): string {
  if (
    /not verified|no está verific|verif|e-mail is not verified|correo.*verif/i.test(
      apiMessage,
    )
  ) {
    return "Debes verificar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada."
  }
  if (
    /disabled|deshabilitad|desactivad|user account is disabled/i.test(
      apiMessage,
    )
  ) {
    return "Esta cuenta está desactivada. Si necesitas ayuda, contacta con soporte."
  }
  if (
    /unable to log in with provided credentials|credenciales proporcionadas|iniciar sesión con las credenciales|must include.*email|must include.*password/i.test(
      apiMessage,
    )
  ) {
    return LOGIN_WRONG_CREDENTIALS
  }
  return apiMessage
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refresh } = useAuth()

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const successParam = searchParams.get("success")
  const sessionExpired = searchParams.get("session_expired")

  const successMessage =
    successParam === "verify_email"
      ? "Revisa tu correo y confirma el enlace. Después podrás iniciar sesión."
      : successParam === "registered"
        ? "Cuenta creada correctamente. Inicia sesión."
        : null

  const sessionExpiredMessage =
    sessionExpired === "true"
      ? "Tu sesión ha expirado por inactividad. Por favor, inicia sesión nuevamente."
      : null

  const redirectToParam = searchParams.get("redirectTo") ?? redirectTo
  const showGuestCheckout = isCheckoutGuestEntryRedirect(redirectToParam)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    setFieldErrors({})

    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())

    const result = loginSchema.safeParse(data)

    if (!result.success) {
      const formattedErrors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          formattedErrors[String(issue.path[0])] = issue.message
        }
      })
      setFieldErrors(formattedErrors)
      return
    }

    setIsSubmitting(true)

    try {
      await login({
        email: result.data.email.toLowerCase(),
        password: result.data.password,
      })
      await refresh()
      router.refresh()

      // Priority: URL redirectTo param (server-set) > sessionStorage (client event)
      if (redirectToParam && redirectToParam !== "/") {
        sessionStorage.removeItem("redirectAfterLogin")
        router.push(redirectToParam)
      } else {
        const redirectAfterLogin = sessionStorage.getItem("redirectAfterLogin")
        if (redirectAfterLogin) {
          sessionStorage.removeItem("redirectAfterLogin")
          router.push(redirectAfterLogin)
        } else {
          router.push(redirectToParam)
        }
      }
    } catch (error) {
      if (error instanceof APIError) {
        if (error.status === 401 || error.status === 400) {
          const mapped = mapLoginApiErrorMessage(error.message)
          setFormError(
            error.status === 401 && mapped === error.message
              ? LOGIN_WRONG_CREDENTIALS
              : mapped,
          )
        } else {
          setFormError(error.message)
        }
      } else {
        setFormError("Error de conexión.")
      }
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const showGoogle =
    typeof process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID === "string" &&
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.length > 0

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {successMessage && (
        <div className="rounded-xs border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {sessionExpiredMessage && (
        <div className="rounded-xs border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          {sessionExpiredMessage}
        </div>
      )}

      {/* GOOGLE */}
      {showGoogle ? (
        <>
          <GoogleOAuthButton redirectTo={redirectToParam} />
          <div className="text-muted-foreground flex items-center gap-2 text-[11px]">
            <span className="bg-border h-px flex-1" />
            <span>o con email</span>
            <span className="bg-border h-px flex-1" />
          </div>
        </>
      ) : null}

      {/* EMAIL */}
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

      {/* PASSWORD */}
      <div className="space-y-1">
        <Label htmlFor="password">Contraseña</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          aria-invalid={!!fieldErrors.password}
        />
        {fieldErrors.password && (
          <p className="text-xs text-red-600">{fieldErrors.password}</p>
        )}
      </div>

      {formError && <p className="text-xs text-red-600">{formError}</p>}

      <Button type="submit" className="h-10 w-full" disabled={isSubmitting}>
        {isSubmitting ? "Iniciando sesión..." : "Iniciar sesión"}
      </Button>

      <div className="flex justify-start">
        <a
          href="/forgot-password"
          className="text-foreground text-xs font-medium underline-offset-2 hover:underline active:underline"
        >
          ¿Has olvidado tu contraseña?
        </a>
      </div>

      <div className="text-muted-foreground flex items-center gap-2 text-[11px]">
        <span className="bg-border h-px flex-1" />
        <span>¿No tienes cuenta?</span>
        <span className="bg-border h-px flex-1" />
      </div>

      <Link
        href={`/auth/register?redirectTo=${encodeURIComponent(redirectToParam)}`}
        className="border-border text-foreground flex h-10 w-full items-center justify-center rounded-xs border text-center text-sm font-medium hover:cursor-pointer hover:bg-neutral-50 active:bg-neutral-50"
      >
        Crear cuenta
      </Link>

      {showGuestCheckout ? (
        <>
          <div className="text-muted-foreground flex items-center gap-2 text-[11px]">
            <span className="bg-border h-px flex-1" />
            <span>o</span>
            <span className="bg-border h-px flex-1" />
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full"
            onClick={() => router.push(GUEST_CHECKOUT_HREF)}
          >
            Continuar como invitado
          </Button>
        </>
      ) : null}
    </form>
  )
}
