import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FaArrowLeft,
  FaUser,
  FaEnvelope,
  FaCalendar,
  FaUserShield,
} from "react-icons/fa6";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { maskEmailForDemo } from "@/lib/admin/mask-email";
import { getAdminUserDetails } from "@/lib/api/admin";
import { isDemoRole } from "@/lib/roles";
import { auth } from "@/lib/auth/server";
import { formatUserDisplayName } from "@/lib/users/utils";

import { RecentOrdersTable } from "@/features/admin/components/users/RecentOrdersTable";
import { UserAddressesCard } from "@/features/admin/components/users/UserAddressesCard";
import { UserStatsCard } from "@/features/admin/components/users/UserStatsCard";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminUserDetailPage({ params }: Props) {
  const { id } = await params;
  const [data, session] = await Promise.all([getAdminUserDetails(id), auth()]);

  if (!data) return notFound();

  const { user, addresses, recentOrders, totalOrders, totalSpentMinor } = data;
  const maskEmails = isDemoRole(session?.user?.role);
  const emailDisplay = maskEmails ? maskEmailForDemo(user.email) : user.email;
  const profileName = formatUserDisplayName(user) || "Sin nombre";

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b pb-2">
        <div className="flex justify-start">
          <Button variant="ghost" size="icon" asChild className="size-8">
            <Link href="/admin/users">
              <FaArrowLeft className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="flex justify-center">
          <h1 className="text-2xl font-bold tracking-tight text-center">
            Detalles del Cliente
          </h1>
        </div>

        <div />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* COLUMNA IZQUIERDA (Perfil + Direcciones) */}
        <div className="space-y-4 lg:col-span-1">
          {/* 1. PERFIL CARD */}
          <Card>
            <CardContent className="pt-6 pb-4 px-4">
              <div className="flex flex-col items-center text-center">
                <FaUser className="size-10 text-foreground" />

                <h2 className="text-xl font-bold mt-2">{profileName}</h2>

                <div className="mt-2 mb-4">
                  <Badge
                    variant="default"
                    className="inline-flex items-center gap-1 capitalize text-xs"
                  >
                    {user.role === "admin" && (
                      <FaUserShield className="size-3 shrink-0" />
                    )}
                    {user.role}
                  </Badge>
                </div>

                <div className="w-full space-y-3 text-sm text-left border-t pt-4">
                  <div className="flex items-center gap-3 text-foreground">
                    <FaEnvelope className="size-4" />
                    {maskEmails ? (
                      <span className="text-sm font-medium text-muted-foreground">
                        {emailDisplay}
                      </span>
                    ) : (
                      <Link
                        href={`mailto:${user.email}`}
                        className="text-blue-500 hover:underline block underline-offset-4 text-sm font-medium"
                      >
                        {emailDisplay}
                      </Link>
                    )}
                  </div>

                  <div className="flex items-center gap-3 font-medium text-foreground">
                    <FaCalendar className="size-4" />
                    <span>
                      Registrado:{" "}
                      <span className="text-foreground font-medium">
                        {new Date(user.created_at).toLocaleDateString("es-ES", {
                          dateStyle: "medium",
                        })}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 font-medium text-foreground">
                    <FaUser className="size-4" />
                    <span>
                      ID:{" "}
                      <span className="font-mono text-xs text-foreground">
                        {user.id}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. DIRECCIONES */}
          <UserAddressesCard addresses={addresses} />
        </div>

        {/* COLUMNA DERECHA (Stats + Pedidos) */}
        <div className="space-y-4 lg:col-span-2">
          {/* 3. STATS */}
          <UserStatsCard
            totalOrders={totalOrders}
            totalSpentMinor={totalSpentMinor}
          />

          {/* 4. ÚLTIMOS PEDIDOS */}
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-neutral-50/50 pb-1 pt-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">
                  Últimos Pedidos
                </CardTitle>

                <Link
                  href={
                    maskEmails
                      ? `/admin/orders?userId=${user.id}`
                      : `/admin/orders?query=${encodeURIComponent(user.email ?? "")}`
                  }
                  className="text-sm fx-underline-anim font-medium"
                >
                  Ver todos los pedidos &rarr;
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <RecentOrdersTable orders={recentOrders} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
