"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useRef, useState } from "react"
import { FaCircleCheck, FaCircleXmark } from "react-icons/fa6"
import { ImSpinner8 } from "react-icons/im"

import { Button } from "@/components/ui/button"

import { verifyEmail } from "@/lib/api/auth"
import { APIError } from "@/lib/api/client"

type Outcome = "loading" | "success" | "error"

function VerifyEmailInner() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [outcome, setOutcome] = useState<Outcome>(() =>
    token ? "loading" : "error",
  )
  const [message, setMessage] = useState(() =>
    token ? "" : "Token inválido o no proporcionado.",
  )
  const ran = useRef(false)

  useEffect(() => {
    if (!token) {
      setOutcome("error")
      setMessage("Token inválido o no proporcionado.")
      return
    }
    if (ran.current) return
    ran.current = true

    let cancelled = false
    void (async () => {
      try {
        await verifyEmail(token)
        if (!cancelled) {
          setOutcome("success")
          setMessage("Tu correo ha sido verificado correctamente.")
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setOutcome("error")
          setMessage(
            e instanceof APIError
              ? e.message
              : "No se pudo verificar el correo. Inténtalo de nuevo.",
          )
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token])

  if (outcome === "loading") {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center py-16">
        <ImSpinner8 className="text-muted-foreground size-8 animate-spin" />
      </div>
    )
  }

  const success = outcome === "success"

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 px-4 text-center">
      <div
        className={`flex items-center justify-center rounded-full p-6 ${
          success ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
        }`}
      >
        {success ? (
          <FaCircleCheck className="size-12" aria-hidden />
        ) : (
          <FaCircleXmark className="size-12" aria-hidden />
        )}
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {success ? "¡Email Verificado!" : "Error de Verificación"}
        </h1>
        <p className="text-muted-foreground mx-auto max-w-sm">{message}</p>
      </div>
      {success ? (
        <Button asChild className="h-11">
          <Link href="/auth/login">Iniciar sesión</Link>
        </Button>
      ) : (
        <Button asChild className="h-11">
          <Link href="/">Volver a la tienda</Link>
        </Button>
      )}
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Suspense
        fallback={
          <div className="flex min-h-0 flex-1 items-center justify-center py-16">
            <ImSpinner8 className="text-muted-foreground size-8 animate-spin" />
          </div>
        }
      >
        <VerifyEmailInner />
      </Suspense>
    </div>
  )
}
