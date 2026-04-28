import { FaMapLocationDot, FaPlus } from "react-icons/fa6";

import { AddressCard } from "@/features/account/components/AddressCard";
import { AddressFormDialog } from "@/features/account/components/AddressFormDialog";

import { Button } from "@/components/ui/button";

import { serverGetUserAddresses } from "@/lib/api/account/server";
import { auth } from "@/lib/api/auth/server";

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mis direcciones",
  description: "Gestiona tus direcciones de envío guardadas en LSB Shop.",
  robots: { index: false, follow: false },
};

export default async function AccountAddressesPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const addresses = await serverGetUserAddresses();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-300 pb-3">
        <div>
          <h2 className="text-2xl font-semibold text-center">
            Mis Direcciones
          </h2>
        </div>

        <AddressFormDialog
          trigger={
            <Button>
              <FaPlus className="size-4" /> Nueva Dirección
            </Button>
          }
        />
      </div>

      {/* LISTADO */}
      {addresses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-neutral-50/50 border rounded-xs">
          <div className="p-4 bg-white rounded-full shadow-sm mb-4">
            <FaMapLocationDot className="size-8 text-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">
            No tienes direcciones guardadas
          </h3>
          <p className="mb-6 mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
            Agrega una dirección para agilizar tus compras futuras.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
          {addresses.map((address) => (
            <AddressCard key={address.id} address={address} />
          ))}
        </div>
      )}
    </div>
  );
}
