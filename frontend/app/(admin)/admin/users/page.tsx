import { type Metadata } from "next";

import { UserListToolbar } from "@/features/admin/components/users/UserListToolbar";
import { UserTable } from "@/features/admin/components/users/UserTable";
import { PaginationNav } from "@/features/catalog/components/PaginationNav";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { getAdminUsers } from "@/lib/api/admin";
import { auth } from "@/lib/api/auth/server";
import { isDemoRole } from "@/lib/roles";


export const metadata: Metadata = {
  title: "Admin | Usuarios",
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    q?: string;
    role?: string;
    page?: string;
    sort?: string;
  }>;
};

export default async function AdminUsersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const session = await auth();
  const maskEmails = isDemoRole(session?.user?.role);

  const page = Number(sp.page) || 1;
  const query = sp.q || "";
  const role =
    sp.role === "admin" || sp.role === "user" || sp.role === "demo"
      ? sp.role
      : undefined;

  const sort = sp.sort || "createdAt-desc";

  const { users, totalCount, totalPages } = await getAdminUsers({
    page,
    limit: 10,
    query,
    role,
    sort,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-3xl font-semibold border-b w-full pb-2">
          Clientes / Usuarios
        </h1>
      </div>

      <Card>
        <CardHeader className="p-4 border-b flex flex-col md:flex-row md:items-center items-start justify-between gap-2 md:gap-5">
          <CardTitle className="flex items-center gap-1 text-lg font-semibold w-fit">
            Total <span className="text-base">({totalCount})</span>
          </CardTitle>
          <div className="w-full">
            <UserListToolbar />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <UserTable users={users} maskEmails={maskEmails} />

          {totalPages > 1 && (
            <div className="py-4 flex justify-end px-4 border-t">
              <PaginationNav totalPages={totalPages} page={page} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
