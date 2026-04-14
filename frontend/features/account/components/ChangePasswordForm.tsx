"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ImSpinner2 } from "react-icons/im";
import { toast } from "sonner";

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

import {
  changePasswordSchema,
  type ChangePasswordValues,
} from "@/lib/account/schema";

import { updatePassword } from "./actions";

export default function ChangePasswordForm() {
  const [loading, setLoading] = useState(false);

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  async function onSubmit(data: ChangePasswordValues) {
    setLoading(true);
    try {
      const res = await updatePassword(data);
      if (!res.success) {
        toast.error(res.error || "Error al actualizar la contraseña");
        return;
      }

      toast.success("Contraseña actualizada correctamente");
      form.reset();
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-xl pt-4 pb-6 px-4 mx-auto">
      <CardHeader className="px-0 pt-0 pb-4">
        <CardTitle className="text-xl text-center font-semibold">
          Cambiar contraseña
        </CardTitle>
        <CardDescription>
          Asegúrate de usar una contraseña segura y única.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña actual</FormLabel>
                  <FormControl>
                    <PasswordInput {...field} disabled={loading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nueva contraseña</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="Mínimo 8 caracteres, números y letras"
                      {...field}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmNewPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar nueva contraseña</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="Repite la nueva contraseña"
                      {...field}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={loading} className="h-10">
                {loading && <ImSpinner2 className="mr-2 size-4 animate-spin" />}
                Actualizar contraseña
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
