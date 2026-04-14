"use client";

import type { UserAddress } from "@/types/address";
import {
  FaTruck,
  FaPlus,
  FaCheck,
  FaCircleCheck,
  FaMapLocationDot,
  FaLocationDot,
} from "react-icons/fa6";

import { Button, Label } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { SHIPPING_METHODS } from "@/lib/locations";

import { useShippingSection } from "@/features/checkout/hooks/use-shipping-section";

import { ShippingAddressForm } from "./ShippingAddressForm";

type Props = {
  savedAddresses: UserAddress[];
  selectedAddressId: string;
  setSelectedAddressId: (id: string) => void;
  isAddressConfirmed: boolean;
  onConfirmAddress: () => void;
  onChangeAddress: () => void;
  isGuest: boolean;
};

export function ShippingSection(props: Props) {
  const {
    shippingType,
    isFormOpen,
    addressToEdit,
    isSelectingMethod,
    handleSelectMethod,
    handleChangeMethod,
    handleSelectAddress,
    handleEditClick,
    handleAddNewClick,
    handleFormSuccess,
    handleCancelForm,
    guestAddress,
  } = useShippingSection(
    props.savedAddresses,
    props.selectedAddressId,
    props.setSelectedAddressId,
    props.isAddressConfirmed,
    props.onConfirmAddress,
    props.onChangeAddress,
    props.isGuest,
  );

  const activeMethod = SHIPPING_METHODS.find((m) => m.id === shippingType);

  const effectiveAddresses =
    props.isGuest && guestAddress ? [guestAddress] : props.savedAddresses;

  const hasSavedAddresses = effectiveAddresses.length > 0;

  return (
    <div>
      <CardHeader className="px-0 mt-6 lg:mt-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FaTruck className="text-foreground" />
            Método de entrega
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 px-0">
        {/* 2. CONTENIDO DEL MÉTODO SELECCIONADO (SIEMPRE HOME) */}
        {activeMethod && (
          <div>
            <div className="mb-6 border rounded-xs p-4 py-6 flex items-center justify-start font-medium text-sm gap-5 shadow-sm">
              <FaCircleCheck className="text-foreground size-5" />
              <div className="flex items-center gap-2">
                <activeMethod.icon />
                <span>{activeMethod.label}</span>
              </div>
            </div>

            {/* LÓGICA DE DIRECCIONES (SOLO SI ES HOME) */}
            {shippingType === "home" && (
              <div className="space-y-4">
                {isFormOpen ? (
                  <ShippingAddressForm
                    initialData={addressToEdit}
                    onCancel={handleCancelForm}
                    onSuccess={handleFormSuccess}
                    isGuest={props.isGuest}
                  />
                ) : (
                  <div className="space-y-2">
                    {hasSavedAddresses && (
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold flex items-center gap-2">
                          <FaMapLocationDot className="text-foreground" />
                          {props.isAddressConfirmed
                            ? "Dirección confirmada"
                            : "Selecciona una dirección"}
                        </Label>
                        {/* CAMBIAR: Solo para NO invitados */}
                        {props.isAddressConfirmed && !props.isGuest && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={props.onChangeAddress}
                            className="h-auto p-1 px-2 text-xs rounded-full"
                          >
                            Cambiar
                          </Button>
                        )}
                      </div>
                    )}

                    {/* --- CASO 1: NO HAY DIRECCIONES GUARDADAS --- */}
                    {!hasSavedAddresses && (
                      <div className="flex flex-col items-center justify-center py-8 px-4 text-center border rounded-xs shadow-sm">
                        <div className="bg-white p-3 rounded-full shadow-sm mb-3 border">
                          <FaLocationDot className="text-foreground size-5" />
                        </div>
                        <p className="text-sm text-neutral-500 mb-5 max-w-[250px]">
                          Añade una dirección para que podamos enviar tu pedido.
                        </p>
                        <Button
                          type="button"
                          onClick={handleAddNewClick}
                          className="bg-black text-white hover:bg-neutral-800"
                        >
                          <FaPlus className="size-3.5" />{" "}
                          {props.isGuest
                            ? "Añadir dirección de entrega"
                            : "Añadir nueva dirección"}
                        </Button>
                      </div>
                    )}

                    {/* --- CASO 2: HAY DIRECCIONES (LISTADO) --- */}
                    {/* Si es GUEST y ya tiene dirección, NO mostramos botón de añadir nueva, solo la card para editar */}
                    {hasSavedAddresses && (
                      <div className="grid grid-cols-1 gap-3 shadow-sm">
                        {(props.isAddressConfirmed
                          ? effectiveAddresses.filter(
                              (a) => a.id === props.selectedAddressId,
                            )
                          : effectiveAddresses
                        ).map((addr) => {
                          const isSelected =
                            props.selectedAddressId === addr.id;
                          return (
                            <div
                              onClick={() => handleSelectAddress(addr.id)}
                              key={addr.id}
                              className={`relative flex flex-col border rounded-xs transition-all duration-200 px-4 py-3 ${
                                props.isAddressConfirmed
                                  ? "cursor-default"
                                  : isSelected
                                    ? "border-foreground cursor-pointer"
                                    : "border-border hover:border-foreground bg-neutral-50 cursor-pointer"
                              }`}
                            >
                              <div
                                className={`relative flex items-center gap-4`}
                              >
                                <div className="shrink-0">
                                  {props.isAddressConfirmed ? (
                                    <FaCircleCheck className="text-foreground size-5" />
                                  ) : (
                                    <div
                                      className={`flex h-4 w-4 items-center justify-center rounded-full border border-primary text-primary ${
                                        isSelected ? "" : "opacity-50"
                                      }`}
                                    >
                                      {isSelected && (
                                        <div className="h-2.5 w-2.5 rounded-full bg-current" />
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Contenido de la dirección */}
                                <div className="flex-1 font-normal text-sm">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold">
                                      {addr.firstName} {addr.lastName}
                                    </span>
                                    {/* EDITAR: Si no está confirmada O es invitado (siempre puede editar) */}
                                    {(!props.isAddressConfirmed ||
                                      props.isGuest) && (
                                      <button
                                        type="button"
                                        className="text-xs font-medium fx-underline-anim"
                                        onClick={(e) =>
                                          handleEditClick(e, addr)
                                        }
                                      >
                                        Editar
                                      </button>
                                    )}
                                  </div>
                                  <span className="block mt-0.5">
                                    {addr.phone}
                                  </span>
                                  <p>
                                    {addr.street}, {addr.details || ""},{" "}
                                    {addr.postalCode}
                                  </p>
                                  <p>
                                    {addr.city}, {addr.province}, {addr.country}
                                  </p>

                                  {addr.isDefault && (
                                    <Badge
                                      variant="default"
                                      className="text-xs px-2 py-0.5 mt-2"
                                    >
                                      Predeterminada
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Botones de acción dentro de la tarjeta seleccionada */}
                              {/* SOLO MOSTRAR SI NO ES GUEST */}
                              {!props.isGuest &&
                                !props.isAddressConfirmed &&
                                isSelected && (
                                  <div className="flex flex-col sm:flex-row gap-4 pt-4 pb-2">
                                    <Button
                                      type="button"
                                      onClick={handleAddNewClick}
                                      variant="outline"
                                      className="flex-1"
                                    >
                                      <FaPlus className="size-3" /> Añadir nueva
                                      dirección
                                    </Button>

                                    {props.selectedAddressId && (
                                      <Button
                                        type="button"
                                        onClick={props.onConfirmAddress}
                                        variant="default"
                                        className="flex-1"
                                      >
                                        <FaCheck className="size-3" /> Usar esta
                                        dirección
                                      </Button>
                                    )}
                                  </div>
                                )}
                            </div>
                          );
                        })}

                        {/* Botón de añadir extra si no hay ninguna seleccionada pero hay lista */}
                        {!props.selectedAddressId &&
                          !props.isAddressConfirmed &&
                          !props.isGuest && (
                            <Button
                              type="button"
                              onClick={handleAddNewClick}
                              variant="outline"
                              className="w-full mt-2"
                            >
                              <FaPlus className="size-3 mr-2" /> Añadir otra
                              dirección
                            </Button>
                          )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </div>
  );
}
