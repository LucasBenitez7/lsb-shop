import { SettingsForm } from "@/features/admin/components/settings/SettingsForm";

import { auth } from "@/lib/api/auth/server";
import { getStoreConfig } from "@/lib/api/settings/server";
import { canWriteAdmin } from "@/lib/roles";


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
          Portada, textos del hero y opciones globales de la tienda. Los pedidos,
          envíos y devoluciones se gestionan desde Pedidos en el menú lateral.
        </p>
      </div>

      <SettingsForm initialData={config} readOnly={!canWrite} />
    </div>
  );
}
