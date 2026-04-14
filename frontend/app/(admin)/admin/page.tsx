import Link from "next/link";
import {
  FaBox,
  FaClipboardList,
  FaMoneyBillWave,
  FaUsers,
  FaRotateLeft,
  FaWallet,
  FaArrowTrendUp,
  FaTags,
  FaLayerGroup,
  FaTriangleExclamation,
  FaBoxesStacked,
  FaCircleExclamation,
} from "react-icons/fa6";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { getDashboardStats } from "@/lib/api/admin";
import { formatCurrency, DEFAULT_CURRENCY } from "@/lib/currency";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visión general del rendimiento de tu tienda.
        </p>
      </div>

      {/* --- SECCIÓN 1: FINANZAS (KPIs Principales) --- */}
      <div>
        <h3 className="text-base font-semibold text-foreground uppercase mb-2">
          Rendimiento Financiero
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Ingresos Brutos */}
          <Card className="py-4 px-0">
            <CardHeader className="px-4 flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">
                Ventas Brutas
              </CardTitle>
              <FaMoneyBillWave className="size-4 text-blue-500" />
            </CardHeader>
            <CardContent className="px-4">
              <div className="text-2xl font-bold">
                {formatCurrency(stats.grossRevenue, DEFAULT_CURRENCY)}
              </div>
              <p className="text-xs text-foreground">
                Total facturado histórico
              </p>
            </CardContent>
          </Card>

          {/* Reembolsos */}
          <Card className="py-4 px-0">
            <CardHeader className="px-4 flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">
                Reembolsos
              </CardTitle>
              <FaRotateLeft className="size-4 text-red-500" />
            </CardHeader>
            <CardContent className="px-4">
              <div className="text-2xl font-bold text-red-600">
                - {formatCurrency(stats.totalRefunds, DEFAULT_CURRENCY)}
              </div>
              <p className="text-xs text-foreground">Devoluciones procesadas</p>
            </CardContent>
          </Card>

          {/* NETO (Destacado) */}
          <Card className="bg-emerald-50/50 border-emerald-200 py-4">
            <CardHeader className="px-4 flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-bold text-emerald-700">
                Ingresos Netos
              </CardTitle>
              <FaWallet className="size-4 text-emerald-600" />
            </CardHeader>
            <CardContent className="px-4">
              <div className="text-2xl font-bold text-emerald-700">
                {formatCurrency(stats.netRevenue, DEFAULT_CURRENCY)}
              </div>
              <p className="text-xs text-emerald-600/80 font-medium">
                Beneficio real tras devoluciones
              </p>
            </CardContent>
          </Card>

          {/* Ticket Medio (Calculado al vuelo) */}
          <Card className="py-4 px-0">
            <CardHeader className="px-4 flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">
                Ticket Medio
              </CardTitle>
              <FaArrowTrendUp className="size-4 text-purple-500" />
            </CardHeader>
            <CardContent className="px-4">
              <div className="text-2xl font-bold">
                {stats.paidOrders > 0
                  ? formatCurrency(
                      Math.round(stats.grossRevenue / stats.paidOrders),
                      DEFAULT_CURRENCY,
                    )
                  : formatCurrency(0, DEFAULT_CURRENCY)}
              </div>
              <p className="text-xs text-foreground">Promedio por pedido</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* --- SECCIÓN 2: INVENTARIO Y PRODUCTOS (NUEVO) --- */}
      <div>
        <h3 className="text-base font-semibold text-foreground uppercase tracking-wider mb-2">
          Inventario y Catálogo (Activo)
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Productos Activos vs Archivados */}
          <Card className="py-4 px-0">
            <CardHeader className="px-4 flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">
                Productos Activos
              </CardTitle>
              <FaBox className="size-4 text-slate-500" />
            </CardHeader>
            <CardContent className="px-4">
              <div className="text-2xl font-bold">{stats.activeProducts}</div>
              <p className="text-xs text-foreground">
                De {stats.totalProducts} creados ({stats.archivedProducts}{" "}
                archivados)
              </p>
            </CardContent>
          </Card>

          {/* Variantes Activas */}
          <Card className="py-4 px-0">
            <CardHeader className="px-4 flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">
                Variantes a la venta
              </CardTitle>
              <FaTags className="size-4 text-indigo-500" />
            </CardHeader>
            <CardContent className="px-4">
              <div className="text-2xl font-bold">{stats.totalVariants}</div>
              <p className="text-xs text-foreground">Combinaciones activas</p>
            </CardContent>
          </Card>

          {/* Stock Disponible Real */}
          <Card className="py-4 px-0">
            <CardHeader className="px-4 flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">
                Stock Disponible
              </CardTitle>
              <FaLayerGroup className="size-4 text-teal-500" />
            </CardHeader>
            <CardContent className="px-4">
              <div className="text-2xl font-bold">{stats.totalStock}</div>
              <p className="text-xs text-foreground">
                Unidades listas para vender
              </p>
            </CardContent>
          </Card>

          {/* Alerta Agotados */}
          <Card
            className={
              stats.outOfStockVariants > 0
                ? "border-orange-200 bg-orange-50/30  py-4"
                : "py-4"
            }
          >
            <CardHeader className="px-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-medium text-orange-700">
                Variantes activas sin stock
              </CardTitle>
              <FaTriangleExclamation className="size-4 text-orange-500" />
            </CardHeader>
            <CardContent className="px-4 py-2">
              <div className="text-2xl font-bold text-orange-700">
                {stats.outOfStockVariants}
              </div>
              {stats.outOfStockVariants > 0 && (
                <Link
                  href="/admin/products?stock=out"
                  className="inline-block mt-2 text-xs font-semibold text-orange-700 hover:text-orange-800 underline underline-offset-2"
                >
                  Ver productos →
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      {/* --- SECCIÓN 3: OPERACIONES (Pedidos y Usuarios) --- */}
      <div>
        <h3 className="text-base font-semibold text-foreground uppercase tracking-wider mb-2">
          Actividad
        </h3>
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="py-4 px-0">
            <CardHeader className="px-4 flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">
                Pedidos Totales
              </CardTitle>
              <FaClipboardList className="size-4 text-slate-500" />
            </CardHeader>
            <CardContent className="px-4">
              <div className="text-2xl font-bold">{stats.paidOrders}</div>
              <p className="text-xs text-foreground">
                {stats.pendingOrders > 0 && (
                  <span className="text-amber-600 font-medium">
                    {stats.pendingOrders} pendientes de pago
                  </span>
                )}
                {stats.pendingOrders === 0 && "Todos procesados"}
              </p>
              {stats.preparingOrdersCount > 0 && (
                <Link
                  href="/admin/orders?status=ACTIVE"
                  className="inline-block mt-1 text-xs font-semibold text-blue-700 hover:text-blue-800 underline underline-offset-2"
                >
                  {stats.preparingOrdersCount} pendientes de envío →
                </Link>
              )}
            </CardContent>
          </Card>

          <Card className="py-4 px-0">
            <CardHeader className="px-4 flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Clientes</CardTitle>
              <FaUsers className="size-4 text-slate-500" />
            </CardHeader>
            <CardContent className="px-4">
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-foreground">Usuarios registrados</p>
            </CardContent>
          </Card>

          <Card className="py-4 px-0">
            <CardHeader className="px-4 flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">
                Devoluciones realizadas
              </CardTitle>
              <FaBoxesStacked className="size-4 text-slate-500" />
            </CardHeader>
            <CardContent className="px-4">
              <div className="text-2xl font-bold">
                {stats.returnedItemsCount}
              </div>
              <p className="text-xs text-foreground">Productos devueltos</p>
            </CardContent>
          </Card>

          {/* Devoluciones pendientes de respuesta */}
          <Card
            className={
              stats.pendingReturnsCount > 0
                ? "border-amber-200 bg-amber-50/50 py-4"
                : "py-4 px-0"
            }
          >
            <CardHeader className="px-4 flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle
                className={
                  stats.pendingReturnsCount > 0
                    ? "text-base font-semibold text-amber-800"
                    : "text-base font-medium"
                }
              >
                Devoluciones pendientes
              </CardTitle>
              <FaCircleExclamation
                className={
                  stats.pendingReturnsCount > 0
                    ? "size-4 text-amber-600"
                    : "size-4 text-slate-500"
                }
              />
            </CardHeader>
            <CardContent className="px-4">
              <div
                className={
                  stats.pendingReturnsCount > 0
                    ? "text-2xl font-bold text-amber-700"
                    : "text-2xl font-bold"
                }
              >
                {stats.pendingReturnsCount}
              </div>
              <p
                className={
                  stats.pendingReturnsCount > 0
                    ? "text-xs text-amber-600/90 font-medium"
                    : "text-xs text-foreground"
                }
              >
                Solicitudes sin aceptar/rechazar
              </p>
              {stats.pendingReturnsCount > 0 && (
                <Link
                  href="/admin/orders?status=RETURNS"
                  className="inline-block mt-2 text-xs font-semibold text-amber-700 hover:text-amber-800 underline underline-offset-2"
                >
                  Ver en Pedidos →
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
