"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { ImSpinner8 } from "react-icons/im";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { PasswordInput } from "@/components/ui/PasswordInput";

import { confirmPasswordReset } from "@/lib/api/auth";
import { APIError } from "@/lib/api/client";
import { passwordSchema } from "@/lib/auth/schema";

const formSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const linkValid = Boolean(uid && token);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!uid || !token) {
      toast.error("Invalid reset link.");
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset({
        uid,
        token,
        new_password1: values.password,
        new_password2: values.confirmPassword,
      });
      setSuccess(true);
      toast.success("Contraseña restablecida correctamente");
    } catch (error: unknown) {
      const message =
        error instanceof APIError
          ? error.message
          : "Error al restablecer la contraseña";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const centerWrapper =
    "flex flex-1 min-h-0 items-center justify-center w-full overflow-y-auto py-4";

  if (!linkValid) {
    return (
      <div className={centerWrapper}>
        <Card className="w-full max-w-md py-6 space-y-6 my-auto">
          <CardHeader>
            <CardTitle className="text-red-600 text-center">
              Enlace inválido o expirado
            </CardTitle>
            <CardDescription>
              Este enlace de restablecimiento no es válido o ha caducado.
              Solicita uno nuevo para continuar.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button asChild variant="default">
              <Link href="/forgot-password">Solicitar nuevo enlace</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className={centerWrapper}>
        <Card className="w-full max-w-md border space-y-6 p-6 bg-background rounded-xs shadow-sm my-auto">
          <CardHeader className="px-0">
            <CardTitle className="text-green-600 text-center">
              ¡Contraseña Actualizada!
            </CardTitle>
            <CardDescription className="text-center text-foreground">
              Ya puedes iniciar sesión con tu nueva contraseña.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild className="w-full h-10">
              <Link href="/auth/login">Ir a Iniciar Sesión</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={centerWrapper}>
      <Card className="w-full max-w-md border space-y-6 p-6 bg-background rounded-xs shadow-sm my-auto">
        <CardHeader className="px-0">
          <CardTitle className="text-2xl font-bold text-center">
            Nueva Contraseña
          </CardTitle>
          <CardDescription className="text-center">
            Introduce tu nueva contraseña a continuación.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <PasswordInput
                        id="password"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Contraseña</FormLabel>
                    <FormControl>
                      <PasswordInput
                        id="confirmPassword"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button className="w-full h-10" type="submit" disabled={loading}>
                {loading && <ImSpinner8 className="h-4 animate-spin" />}
                Cambiar Contraseña
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <Suspense
        fallback={
          <div className="flex flex-1 min-h-0 items-center justify-center">
            <ImSpinner8 className="size-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
