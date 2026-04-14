import { canWriteAdmin } from "@/lib/roles";
import { auth } from "@/lib/auth/server";
import { getStoreConfig } from "@/lib/settings/service";

import { SettingsForm } from "@/features/admin/components/settings/SettingsForm";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Configuración de la Tienda | Admin",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const [config, session] = await Promise.all([getStoreConfig(), auth()]);
  const canWrite = canWriteAdmin(session?.user?.role);

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="border-b pb-2">
        <h1 className="text-2xl lg:text-3xl font-semibold">Configuración</h1>
        <p className="text-muted-foreground">
          Gestiona el contenido de la página de inicio y otras opciones
          globales.
        </p>
      </div>

      <SettingsForm initialData={config} readOnly={!canWrite} />
    </div>
  );
}
