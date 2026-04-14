import { FaUser, FaEnvelope, FaPhone } from "react-icons/fa6";

import VerifyEmailButton from "@/features/account/components/VerifyEmailButton";
import { Card, CardContent } from "@/components/ui/card";

import { auth } from "@/lib/auth/server";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mi cuenta",
  description:
    "Gestiona tu perfil, dirécciones, pedidos y ajustes de seguridad en LSB Shop.",
  robots: { index: false, follow: false },
};

export default async function AccountProfilePage() {
  const session = await auth();
  const user = session?.user;

  if (!user) return null;

  const isVerified = user.is_email_verified;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl text-center sm:text-left font-semibold pb-2 border-b border-neutral-300">
          Mi Cuenta
        </h2>
      </div>

      {!isVerified && (
        <div className="bg-blue-50 border border-blue-200 rounded-xs p-4 flex flex-col sm:flex-row items-start justify-between gap-4 shadow w-full mb-2">
          <div className="flex flex-col sm:flex-row">
            <div>
              <h3 className="text-sm font-semibold text-blue-800">
                Tu correo no está verificado
              </h3>
              <p className="text-sm text-blue-700">
                Verifica tu cuenta para asegurar el acceso y recibir
                notificaciones importantes.
              </p>
            </div>
          </div>
          <VerifyEmailButton />
        </div>
      )}

      <Card className="overflow-hidden pb-0">
        <CardContent className="p-4">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase">
                <FaUser className="size-3" /> Nombre
              </div>
              <p className="text-sm font-medium text-foreground pl-6">
                {user.first_name || "No especificado"}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase">
                <FaUser className="size-3" /> Apellidos
              </div>
              <p className="text-sm font-medium text-foreground pl-6">
                {user.last_name || "No especificado"}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase">
                <FaEnvelope className="size-3" /> Correo Electrónico
                {isVerified && (
                  <div className="flex items-center py-0.5 px-2 rounded-full bg-green-50 text-green-600 text-xs font-medium lowercase">
                    verificado
                  </div>
                )}
              </div>
              <p className="text-sm font-medium text-foreground pl-6">
                {user.email}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase">
                <FaPhone className="size-3" /> Teléfono
              </div>
              <p className="text-sm font-medium text-foreground pl-6">
                {user.phone ? (
                  user.phone
                ) : (
                  <span className="text-neutral-400 italic text-sm">
                    No registrado
                  </span>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
