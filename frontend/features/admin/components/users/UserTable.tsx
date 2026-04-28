"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { maskEmailForDemo } from "@/lib/admin/mask-email";
import { formatUserDisplayName } from "@/lib/users/utils";

import type { AdminUserListItem } from "@/types/user";

interface UserTableProps {
  users: AdminUserListItem[];
  /** Rol demo: no mostrar correos completos ni enlaces mailto. */
  maskEmails?: boolean;
}

export function UserTable({ users, maskEmails }: UserTableProps) {
  const searchParams = useSearchParams();
  const query = searchParams.get("q");

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-foreground rounded-xs">
        <p className="font-semibold text-lg">
          {query ? "No se encontraron usuarios" : "No hay usuarios registrados"}
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
            <TableHead>ID</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-left">Email</TableHead>
            <TableHead className="text-left">Registrado</TableHead>
            <TableHead className="text-center">Pedidos</TableHead>
            <TableHead className="text-center px-4">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow
              key={user.id}
              className="hover:bg-neutral-50 transition-colors"
            >
              <TableCell className="py-3 font-mono text-xs font-medium">
                {user.id}
              </TableCell>

              <TableCell>
                <span className="font-medium text-sm">
                  {formatUserDisplayName(user) || "Sin nombre"}
                </span>
              </TableCell>

              <TableCell className="py-3 text-left">
                {maskEmails ? (
                  <span className="text-muted-foreground text-xs">
                    {maskEmailForDemo(user.email)}
                  </span>
                ) : (
                  <Link
                    href={`mailto:${user.email}`}
                    className="text-blue-500 hover:underline block underline-offset-4 text-xs"
                  >
                    {user.email}
                  </Link>
                )}
              </TableCell>

              <TableCell className="py-3 text-left text-xs font-medium">
                {new Date(user.created_at).toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </TableCell>

              <TableCell className="py-3 text-center">
                <Badge variant="default" className="border-foreground text-xs">
                  {user.orders_count}
                </Badge>
              </TableCell>

              <TableCell className="py-3 text-center">
                <Link
                  href={`/admin/users/${user.id}`}
                  className="fx-underline-anim font-medium text-sm"
                >
                  Ver detalles
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
