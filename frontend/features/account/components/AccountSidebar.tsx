"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FaBoxOpen,
  FaMapLocationDot,
  FaUserGear,
  FaShieldHalved,
  FaRightFromBracket,
  FaHeart,
} from "react-icons/fa6";

import { useAuth } from "@/features/auth/components/AuthProvider";

import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    label: "Cuenta",
    href: "/account",
    icon: FaUserGear,
    exact: true,
  },
  {
    label: "Direcciones",
    href: "/account/addresses",
    icon: FaMapLocationDot,
  },
  {
    label: "Pedidos",
    href: "/account/orders",
    icon: FaBoxOpen,
  },
  {
    label: "Favoritos",
    href: "/account/favoritos",
    icon: FaHeart,
  },
  {
    label: "Seguridad",
    href: "/account/security",
    icon: FaShieldHalved,
  },
];

type Props = {
  user: {
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  };
};

export function AccountSidebar({ user }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  return (
    <nav className="flex flex-col mx-auto justify-between items-center w-full lg:max-w-5xl lg:flex-row bg-background rounded-xs border text-center">
      {NAV_ITEMS.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex w-full items-center gap-3 px-3 py-3 text-sm font-semibold text-center transition-colors justify-center",
              isActive
                ? "bg-foreground text-background shadow-sm"
                : "hover:bg-neutral-100 active:bg-neutral-100",
            )}
          >
            <Icon
              className={cn(
                "size-4",
                isActive ? "text-background" : "text-foreground",
              )}
            />
            {item.label}
          </Link>
        );
      })}
      <Button
        variant={"ghost"}
        onClick={async () => {
          await logout();
          router.push("/auth/login");
        }}
        className="w-full lg:w-auto text-red-600 hover:bg-red-50 active:bg-red-100 hover:text-red-600 py-3 rounded-none"
      >
        <FaRightFromBracket className="size-4" />
        Cerrar sesión
      </Button>
    </nav>
  );
}
