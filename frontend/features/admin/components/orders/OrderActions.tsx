"use client"

import type { FulfillmentStatus, PaymentStatus } from "@/types/enums"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { FaBox, FaTruckFast, FaCheckDouble, FaLock } from "react-icons/fa6"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { updateFulfillmentStatusAction } from "@/lib/api/orders/mutations"
import { SHIPPING_CARRIER_OPTIONS } from "@/lib/orders/shipping-carriers"

type Props = {
  orderId: string
  currentStatus: FulfillmentStatus
  paymentStatus: PaymentStatus
  isCancelled: boolean
}

export function AdminFulfillmentActions({
  orderId,
  currentStatus,
  paymentStatus,
  isCancelled,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [shipOpen, setShipOpen] = useState(false)
  const [carrier, setCarrier] = useState("")

  if (isCancelled) return null

  const isPaidLike =
    paymentStatus === "PAID" || paymentStatus === "PARTIALLY_REFUNDED"

  const handleUpdate = async (nextStatus: FulfillmentStatus) => {
    setLoading(true)
    const res = await updateFulfillmentStatusAction(orderId, nextStatus)
    if (res?.error) {
      toast.error(res.error)
    } else {
      toast.success("Estado logístico actualizado")
      router.refresh()
    }
    setLoading(false)
  }

  const LockedButton = () => (
    <Button
      disabled
      className="cursor-not-allowed border border-neutral-200 bg-neutral-100 text-neutral-600 shadow-none"
    >
      <FaLock className="size-3.5" />
      Esperando Pago...
    </Button>
  )

  if (currentStatus === "UNFULFILLED") {
    if (!isPaidLike) {
      return <LockedButton />
    }

    return (
      <Button
        onClick={() => void handleUpdate("PREPARING")}
        disabled={loading}
        className="bg-blue-600 text-white shadow-sm hover:bg-blue-700"
      >
        <FaBox className="size-3.5" />
        Preparar Pedido
      </Button>
    )
  }

  if (currentStatus === "PREPARING") {
    if (!isPaidLike) {
      return <LockedButton />
    }

    return (
      <>
        <Button
          onClick={() => {
            setCarrier("")
            setShipOpen(true)
          }}
          disabled={loading}
          className="bg-blue-600 text-white shadow-sm hover:bg-blue-700"
        >
          <FaTruckFast className="size-3.5" />
          Marcar como Enviado
        </Button>
        <Dialog open={shipOpen} onOpenChange={setShipOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar envío</DialogTitle>
              <DialogDescription>
                Elige el transportista. El número de seguimiento se genera
                automáticamente en el servidor para este pedido. Se enviará un
                correo al cliente con ambos datos.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid gap-1.5">
                <span className="text-sm font-medium">
                  Transportista <span className="text-red-600">*</span>
                </span>
                <Select
                  value={carrier || undefined}
                  onValueChange={setCarrier}
                >
                  <SelectTrigger
                    id="ship-carrier"
                    className="w-full"
                    aria-label="Transportista"
                  >
                    <SelectValue placeholder="Selecciona transportista" />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIPPING_CARRIER_OPTIONS.map((label) => (
                      <SelectItem key={label} value={label}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShipOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={loading}
                onClick={() => {
                  if (!carrier.trim()) {
                    toast.error("Selecciona un transportista.")
                    return
                  }
                  setLoading(true)
                  void (async () => {
                    const res = await updateFulfillmentStatusAction(
                      orderId,
                      "SHIPPED",
                      { carrier: carrier.trim() },
                    )
                    if (res?.error) {
                      toast.error(res.error)
                    } else {
                      toast.success("Estado logístico actualizado")
                      setShipOpen(false)
                      router.refresh()
                    }
                    setLoading(false)
                  })()
                }}
              >
                Confirmar envío
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  if (currentStatus === "SHIPPED" || currentStatus === "READY_FOR_PICKUP") {
    return (
      <Button
        onClick={() => void handleUpdate("DELIVERED")}
        disabled={loading}
        className="bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
      >
        <FaCheckDouble className="size-3.5" />
        Confirmar Entrega
      </Button>
    )
  }

  return null
}
