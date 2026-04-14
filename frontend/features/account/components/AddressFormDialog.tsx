"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FaPlus } from "react-icons/fa6";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  addressFormSchema,
  type AddressFormValues,
} from "@/lib/account/schema";

import { upsertAddress } from "@/lib/api/account";

type Props = {
  address?: AddressFormValues;
  trigger?: React.ReactNode;
};

export function AddressFormDialog({ address, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const isEditing = !!address;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(addressFormSchema),
    defaultValues: {
      id: address?.id,
      firstName: address?.firstName ?? "",
      lastName: address?.lastName ?? "",
      phone: address?.phone ?? "",
      street: address?.street ?? "",
      details: address?.details ?? "",
      postalCode: address?.postalCode ?? "",
      city: address?.city ?? "",
      province: address?.province ?? "",
      country: address?.country ?? "España",
      isDefault: address?.isDefault ?? false,
    },
  });

  const onSubmit = async (data: AddressFormValues) => {
    setLoading(true);
    const payload = isEditing ? { ...data, id: address.id } : data;

    try {
      await upsertAddress(payload);
      toast.success(isEditing ? "Dirección actualizada" : "Dirección guardada");
      setOpen(false);
      if (!isEditing) reset();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error al guardar la dirección.",
      );
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button>
            <FaPlus className="mr-2 size-4" /> Nueva Dirección
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg mt-6">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Dirección" : "Nueva Dirección"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Formulario para {isEditing ? "editar" : "crear"} una dirección de
            envío
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Nombre y Apellido */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input {...register("firstName")} placeholder="Ej: Juan" />
              {errors.firstName && (
                <p className="text-xs text-red-500">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Apellidos</Label>
              <Input {...register("lastName")} placeholder="Pérez" />
              {errors.lastName && (
                <p className="text-xs text-red-500">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Teléfono</Label>
            <Input {...register("phone")} placeholder="+34 600..." />
            {errors.phone && (
              <p className="text-xs text-red-500">{errors.phone.message}</p>
            )}
          </div>

          {/* Dirección */}
          <div className="space-y-2">
            <Label>Calle y número</Label>
            <Input {...register("street")} placeholder="Calle Mayor 123" />
            {errors.street && (
              <p className="text-xs text-red-500">{errors.street.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Piso, Puerta, Escalera...</Label>
            <Input
              {...register("details")}
              placeholder="Piso 4B, Bloque A..."
            />
            {errors.details && (
              <p className="text-xs text-red-500">{errors.details.message}</p>
            )}
          </div>

          {/* Ciudad/Provincia/CP */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>C. Postal</Label>
              <Input {...register("postalCode")} placeholder="28001" />
              {errors.postalCode && (
                <p className="text-xs text-red-500">
                  {errors.postalCode.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Ciudad</Label>
              <Input {...register("city")} placeholder="Madrid" />
              {errors.city && (
                <p className="text-xs text-red-500">{errors.city.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Provincia</Label>
              <Input {...register("province")} placeholder="Madrid" />
              {errors.province && (
                <p className="text-xs text-red-500">
                  {errors.province.message}
                </p>
              )}
            </div>
          </div>

          {/* Checkbox Default */}
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="default"
              defaultChecked={address?.isDefault}
              onCheckedChange={(checked) => {
                const event = { target: { name: "isDefault", value: checked } };
                register("isDefault").onChange(event as any);
              }}
              {...register("isDefault")}
            />
            <Label
              htmlFor="default"
              className="text-sm font-medium leading-none cursor-pointer"
            >
              Usar como dirección predeterminada
            </Label>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-black text-white"
            >
              {loading ? "Guardando..." : "Guardar Dirección"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
