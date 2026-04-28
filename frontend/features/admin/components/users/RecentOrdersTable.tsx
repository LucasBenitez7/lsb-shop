"use client";

import Link from "next/link";

import { OrderStatusBadge } from "@/features/orders/components/OrderStatusBadge";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { formatCurrency } from "@/lib/currency";

import type { OrderListItemBase } from "@/types/order";

export function RecentOrdersTable({
  orders,
}: {
  orders: OrderListItemBase[];
}) {
  if (orders.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        Este usuario aún no ha realizado pedidos.
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
            <TableHead className="text-center">Estado</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id} className="hover:bg-neutral-50 h-12">
              <TableCell className="font-mono text-xs uppercase font-medium">
                {order.id.toUpperCase()}
              </TableCell>

              {/* FECHA */}
              <TableCell className="text-xs font-medium text-foreground">
                {new Date(order.createdAt).toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </TableCell>

              {/* ESTADO */}
              <TableCell className="text-center">
                <OrderStatusBadge
                  paymentStatus={order.paymentStatus}
                  fulfillmentStatus={order.fulfillmentStatus}
                  isCancelled={order.isCancelled}
                  className="text-xs px-2 py-0.5"
                />
              </TableCell>

              {/* TOTAL */}
              <TableCell className="text-right font-medium text-sm">
                {formatCurrency(order.totalMinor, order.currency)}
              </TableCell>

              {/* ACCIONES */}
              <TableCell className="text-center">
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="text-xs font-medium fx-underline-anim"
                >
                  Ver pedido
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
