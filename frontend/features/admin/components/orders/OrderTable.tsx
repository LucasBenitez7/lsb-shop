"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { OrderStatusBadge } from "@/features/orders/components/OrderStatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { maskEmailForDemo } from "@/lib/admin/mask-email";
import { formatCurrency } from "@/lib/currency";
import { getReturnStatusBadge } from "@/lib/orders/utils";
import { cn } from "@/lib/utils";

import type { AdminOrderListItem } from "@/lib/orders/types";

interface OrderTableProps {
  orders: AdminOrderListItem[];
  showRefunds?: boolean;
  maskEmails?: boolean;
}

export function OrderTable({
  orders,
  showRefunds,
  maskEmails,
}: OrderTableProps) {
  const searchParams = useSearchParams();
  const query = searchParams.get("query");

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-foreground rounded-xs">
        <p className="font-semibold text-lg">
          {query
            ? "No se encontraron pedidos"
            : "No hay pedidos con este filtro"}
        </p>
        {query && (
          <p className="text-sm mt-1 mb-4 text-muted-foreground">
            No hay coincidencias para "{query}"
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <Table>
        <TableHeader className="bg-neutral-50">
          <TableRow>
            <TableHead>Nº de pedido</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-center">Estado</TableHead>
            {/* CAMBIO: Título de columna dinámico */}
            <TableHead className="text-right">
              {showRefunds ? "Total / Reembolso" : "Total"}
            </TableHead>
            <TableHead className="text-center px-4">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const returnAlert = getReturnStatusBadge(order);
            const isReturnPending =
              returnAlert?.label === "Solicitud Pendiente";

            let amountToShow = order.netTotalMinor;

            if (showRefunds) {
              if (isReturnPending) {
                amountToShow = order.totalMinor;
              } else {
                amountToShow = order.refundedAmountMinor;
              }
            }

            return (
              <TableRow
                key={order.id}
                className="hover:bg-neutral-50 transition-colors"
              >
                {/* 1. ID */}
                <TableCell className="font-mono text-xs font-medium">
                  {order.id.toUpperCase()}
                </TableCell>

                {/* 2. FECHA */}
                <TableCell className="text-xs font-medium">
                  {new Date(order.createdAt).toLocaleDateString()}
                </TableCell>

                {/* 3. CLIENTE */}
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">
                      {order.user?.name || order.guestInfo.firstName}{" "}
                      {order.guestInfo.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {maskEmails
                        ? maskEmailForDemo(
                            order.user?.email || order.guestInfo.email,
                          )
                        : order.user?.email || order.guestInfo.email}
                    </span>
                  </div>
                </TableCell>

                {/* 4. ESTADO (AQUÍ ESTÁ LA CORRECCIÓN VISUAL) */}
                <TableCell className="text-center">
                  {returnAlert ? (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase",
                        returnAlert.badgeClass,
                      )}
                    >
                      {returnAlert.label}
                    </span>
                  ) : (
                    <OrderStatusBadge
                      paymentStatus={order.paymentStatus}
                      fulfillmentStatus={order.fulfillmentStatus}
                      isCancelled={order.isCancelled}
                      className="text-xs uppercase px-2 py-0.5"
                    />
                  )}
                </TableCell>

                {/* 5. TOTAL (CORREGIDO) */}
                <TableCell className="text-right font-medium">
                  {formatCurrency(amountToShow, order.currency)}
                </TableCell>

                {/* 6. ACCIONES */}
                <TableCell className="text-center">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="fx-underline-anim font-medium text-sm"
                  >
                    Ver detalles
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
