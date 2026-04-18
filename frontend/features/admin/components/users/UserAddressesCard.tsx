"use client";

import { FaMapPin, FaStar } from "react-icons/fa6";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

import type { UserAddress } from "@/types/address";

interface UserAddressesCardProps {
  addresses: UserAddress[];
  /** Demo / read-only: hide street-level PII (addresses are not on user API yet). */
  redactSensitive?: boolean;
}

export function UserAddressesCard({
  addresses,
  redactSensitive = false,
}: UserAddressesCardProps) {
  return (
    <Card className="h-fit px-3">
      <CardHeader className="pb-1 pt-3 border-b text-center px-0">
        <CardTitle className="text-base font-semibold flex items-center gap-2 justify-center">
          <FaMapPin className="size-4 text-foreground" />
          Direcciones Guardadas
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 pt-3">
        {redactSensitive ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            En modo demostración no se muestran direcciones ni teléfonos de otros
            clientes.
          </div>
        ) : addresses.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            El usuario no tiene direcciones guardadas.
          </div>
        ) : (
          <div className="divide-y space-y-3">
            {addresses.map((addr) => (
              <div key={addr.id} className="text-sm relative group pb-3">
                {addr.isDefault && (
                  <Badge variant="default" className="gap-1 text-[10px] mb-2">
                    Predeterminada
                  </Badge>
                )}
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-foreground">
                    {addr.firstName} {addr.lastName}
                  </span>
                </div>
                <div className="text-foreground font-medium leading-5">
                  <p>
                    {addr.street} {addr.details}
                  </p>
                  <p>
                    {addr.postalCode}, {addr.city}, {addr.province}
                  </p>
                  <p>{addr.country}</p>
                  <p className="flex items-center gap-1 text-sm">
                    {addr.phone}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
