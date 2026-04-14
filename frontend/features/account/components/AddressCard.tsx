"use client";

import { FaTrash, FaPen } from "react-icons/fa6";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

import { cn } from "@/lib/utils";

import { useAddressActions } from "@/features/account/hooks/use-address-actions";

import { AddressFormDialog } from "./AddressFormDialog";

import type { UserAddress } from "@/types/address";

export function AddressCard({ address }: { address: UserAddress }) {
  const { loading, setAsDefault, removeAddress } = useAddressActions();

  const addressForForm = {
    ...address,
    name: address.name ?? undefined,
    phone: address.phone ?? "",
    details: address.details ?? "",
  };

  return (
    <Card
      className={cn(
        "relative group transition-all overflow-hidden flex flex-col justify-between shadow-sm hover:border-foreground",
      )}
    >
      <CardContent className="p-4 pb-2 space-y-1">
        {!address.isDefault ? (
          <Button
            variant="ghost"
            className="w-fit bg-neutral-100 hover:bg-neutral-200 rounded-full py-1 px-1.5 text-xs"
            onClick={() => setAsDefault(address.id)}
            disabled={loading}
          >
            Establecer como predeterminada
          </Button>
        ) : (
          <Button
            variant="default"
            className="w-fit rounded-full py-1 px-1.5 text-xs"
          >
            Predeterminada
          </Button>
        )}

        {/* Cabecera */}
        <div className="flex justify-between items-center gap-2 pl-1 mt-3">
          <div className="space-y-1">
            <h3 className="font-semibold text-base leading-tight">
              {address.firstName} {address.lastName}
            </h3>
          </div>
        </div>

        {/* Info */}
        <div className="text-sm space-y-1 font-medium pl-1">
          <p className="text-foreground">{address.phone}</p>

          <p>{[address.street, address.details].filter(Boolean).join(", ")}</p>

          <p>
            {[
              address.postalCode,
              address.city,
              address.province,
              address.country,
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
      </CardContent>

      {/* Footer Acciones */}
      <CardFooter className="pb-3 pt-2 px-3 flex items-center justify-between gap-2">
        <div className="space-x-4">
          <AddressFormDialog
            address={addressForForm}
            trigger={
              <Button
                variant="ghost"
                className="hover:bg-blue-50 hover:text-blue-600"
              >
                <FaPen className="size-3.5" /> Editar
              </Button>
            }
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                className="hover:bg-red-50 hover:text-red-600"
              >
                <FaTrash className="size-3.5" /> Borrar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar dirección?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => removeAddress(address.id)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {loading ? "..." : "Eliminar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardFooter>
    </Card>
  );
}
