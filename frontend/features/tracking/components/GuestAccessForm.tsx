"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { FaArrowLeft } from "react-icons/fa6";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import {
  requestGuestAccess,
  verifyGuestAccess,
} from "@/lib/api/guest/mutations";
import {
  guestAccessStep1Schema,
  guestAccessStep2Schema,
  type GuestAccessStep1Values,
  type GuestAccessStep2Values,
} from "@/lib/tracking/schema";

/**
 * Guest tracking OTP flow — matches acme-commerce-starter `GuestAccessForm` pattern:
 * local `debugOtp` drives the OTP UI and syncs into react-hook-form via `setValue`,
 * so `input-otp` stays decoupled from Controller `value`/`onChange` quirks.
 */
export function GuestAccessForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultOrderId = searchParams.get("orderId") ?? "";

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [orderDetails, setOrderDetails] = useState<{
    orderId: string;
    email: string;
  } | null>(null);

  const [debugOtp, setDebugOtp] = useState("");

  const form1 = useForm<GuestAccessStep1Values>({
    resolver: zodResolver(guestAccessStep1Schema),
    defaultValues: { orderId: defaultOrderId, email: "" },
  });

  const form2 = useForm<GuestAccessStep2Values>({
    resolver: zodResolver(guestAccessStep2Schema),
    defaultValues: { otp: "" },
  });

  useEffect(() => {
    form2.setValue("otp", debugOtp, {
      shouldValidate: debugOtp.length === 6,
      shouldDirty: true,
    });
  }, [debugOtp, form2]);

  useEffect(() => {
    const id = searchParams.get("orderId");
    if (id) form1.setValue("orderId", id);
  }, [searchParams, form1]);

  const onStep1Submit = async (values: GuestAccessStep1Values) => {
    setLoading(true);
    try {
      const res = await requestGuestAccess(values.orderId, values.email);
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo enviar el código");
      } else {
        toast.success(
          res.message ??
            "Te hemos enviado un código de verificación al email del pedido.",
        );
        setOrderDetails(values);
        setDebugOtp("");
        form2.reset({ otp: "" });
        setStep(2);
      }
    } catch {
      toast.error("Ocurrió un error");
    } finally {
      setLoading(false);
    }
  };

  const onStep2Submit = async (values: GuestAccessStep2Values) => {
    if (!orderDetails) return;

    setLoading(true);
    try {
      const res = await verifyGuestAccess(
        orderDetails.orderId,
        orderDetails.email,
        values.otp,
      );
      if (!res.ok) {
        toast.error(res.error ?? "Código incorrecto");
        return;
      }
      toast.success("Acceso verificado");
      router.push(`/tracking/${orderDetails.orderId}`);
      router.refresh();
    } catch {
      toast.error("Ocurrió un error");
    } finally {
      setLoading(false);
    }
  };

  if (step === 2) {
    return (
      <Card className="w-full max-w-md mx-auto px-4 py-6 space-y-4">
        <CardHeader className="px-0">
          <CardTitle>Verificación de Seguridad</CardTitle>
          <CardDescription>
            Hemos enviado un código de 6 dígitos a {orderDetails?.email}.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Form {...form2}>
            <form
              onSubmit={form2.handleSubmit(onStep2Submit)}
              className="space-y-4"
            >
              <FormField
                control={form2.control}
                name="otp"
                render={({ field }) => (
                  <FormItem className="space-y-1 mb-8">
                    <FormLabel className="items-center text-center w-fit flex justify-center mx-auto text-base font-semibold">
                      Código de Verificación
                    </FormLabel>
                    <FormControl>
                      <InputOTP
                        maxLength={6}
                        value={debugOtp}
                        onChange={(val) => {
                          setDebugOtp(val);
                        }}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        disabled={loading}
                        autoComplete="one-time-code"
                        containerClassName="justify-center z-10"
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </FormControl>
                    <FormMessage className="items-center text-center" />
                  </FormItem>
                )}
              />
              <div className="flex flex-col gap-2">
                <Button
                  size="lg"
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? "Verificando..." : "Verificar y Acceder"}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    setStep(1);
                    setDebugOtp("");
                    form2.reset({ otp: "" });
                  }}
                  disabled={loading}
                >
                  <FaArrowLeft className="mr-2 size-4" /> Volver al paso
                  anterior
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto px-4 py-4 space-y-6">
      <CardHeader className="px-0">
        <CardTitle>Seguimiento de Pedido</CardTitle>
        <CardDescription>
          Consulta el estado de tu pedido o tramita una devolución sin crear
          cuenta.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <Form {...form1}>
          <form
            onSubmit={form1.handleSubmit(onStep1Submit)}
            className="space-y-6"
          >
            <FormField
              control={form1.control}
              name="orderId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Pedido</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form1.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email de Compra</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Procesando..." : "Continuar"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
