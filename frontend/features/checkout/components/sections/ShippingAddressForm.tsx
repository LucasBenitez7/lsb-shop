"use client";

import type { UserAddress } from "@/types/address";
import { useFormContext } from "react-hook-form";

import { Button, Input, Label, Checkbox } from "@/components/ui";

import { type CreateOrderInput } from "@/lib/orders/schema";

import { useShippingAddressForm } from "@/features/checkout/hooks/use-address-form";

type Props = {
  initialData?: Partial<UserAddress> | null;
  onCancel: () => void;
  onSuccess: (address: UserAddress) => void;
  isGuest: boolean;
};

export function ShippingAddressForm(props: Props) {
  const { isPending, handleSaveAndUse } = useShippingAddressForm(props);

  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<CreateOrderInput>();

  const isDefault = watch("isDefault");

  return (
    <div className="border rounded-xs p-4 animate-in fade-in slide-in-from-top-2 shadow">
      <h4 className="font-semibold text-base mb-4 border-b pb-2">
        {props.initialData?.id
          ? "Editar Dirección"
          : "Nueva Dirección de Envío"}
      </h4>

      <div className="space-y-4">
        {/* --- EMAIL (SOLO GUEST) --- */}
        {props.isGuest && (
          <div className="space-y-1">
            <Label>Email de contacto</Label>
            <Input
              {...register("email")}
              placeholder="tu@email.com"
              type="email"
            />
            {errors.email && (
              <p className="text-red-500 text-xs">{errors.email.message}</p>
            )}
          </div>
        )}

        {/* --- GRID NOMBRES --- */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Nombre</Label>
            <Input {...register("firstName")} placeholder="Ej: Juan" />
            {errors.firstName && (
              <p className="text-red-500 text-xs">{errors.firstName.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Apellidos</Label>
            <Input {...register("lastName")} placeholder="Ej: Pérez" />
            {errors.lastName && (
              <p className="text-red-500 text-xs">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        {/* --- TELÉFONO --- */}
        <div className="space-y-1">
          <Label>Teléfono</Label>
          <Input
            {...register("phone")}
            placeholder="+34 600..."
            onInput={(e) =>
              (e.currentTarget.value = e.currentTarget.value.replace(
                /[^0-9+\s]/g,
                "",
              ))
            }
          />
          {errors.phone && (
            <p className="text-red-500 text-xs">{errors.phone.message}</p>
          )}
        </div>

        {/* --- DIRECCIÓN FÍSICA --- */}
        <div className="space-y-1">
          <Label>Dirección</Label>
          <Input {...register("street")} placeholder="Calle, número..." />
          {errors.street && (
            <p className="text-red-500 text-xs">{errors.street.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label>Piso, Puerta, Escalera...</Label>
          <Input {...register("details")} />
          {errors.details && (
            <p className="text-red-500 text-xs">{errors.details.message}</p>
          )}
        </div>

        {/* --- CP / CIUDAD / PROVINCIA --- */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label>CP</Label>
            <Input
              {...register("postalCode")}
              maxLength={5}
              inputMode="numeric"
              onInput={(e) =>
                (e.currentTarget.value = e.currentTarget.value.replace(
                  /[^0-9]/g,
                  "",
                ))
              }
            />
            {errors.postalCode && (
              <p className="text-red-500 text-xs">
                {errors.postalCode.message}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Ciudad</Label>
            <Input {...register("city")} />
            {errors.city && (
              <p className="text-red-500 text-xs">{errors.city.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Provincia</Label>
            <Input {...register("province")} />
            {errors.province && (
              <p className="text-red-500 text-xs">{errors.province.message}</p>
            )}
          </div>
        </div>

        {/* --- CHECKBOX: GUARDAR COMO PREDETERMINADA --- */}

        {!props.isGuest && (
          <div className="flex items-center space-x-2 pt-2 border-t mt-2">
            <Checkbox
              id="def"
              checked={isDefault}
              onCheckedChange={(c) => setValue("isDefault", c === true)}
            />
            <Label htmlFor="def" className="font-medium cursor-pointer text-sm">
              Guardar como predeterminada
            </Label>
          </div>
        )}

        {/* --- BOTONES --- */}
        <div className="flex gap-4 pt-2 flex-col sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={props.onCancel}
            className="px-4 w-full sm:w-auto"
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSaveAndUse}
            disabled={isPending}
            className="px-4 w-full sm:w-auto"
          >
            {isPending
              ? "Guardando..."
              : props.isGuest
                ? "Usar esta dirección"
                : "Guardar y  Usar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
