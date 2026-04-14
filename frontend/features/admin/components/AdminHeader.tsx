"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useCallback, useEffect } from "react";
import { CgClose } from "react-icons/cg";
import { FaUserShield } from "react-icons/fa6";
import { RiMenu2Line } from "react-icons/ri";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";

import { useCloseOnNav } from "@/hooks/common/use-close-on-nav";
import { formatUserDisplayName } from "@/lib/users/utils";

import { AdminSidebar } from "@/features/admin/components/AdminSidebar";

import type { User } from "@/types/user";

type Props = {
  user: User;
  isReadOnly?: boolean;
};

/** Compact title in header: same idea as before for long full names (4+ tokens). */
function adminHeaderDisplayName(u: User): string {
  const fromName = formatUserDisplayName(u);
  if (fromName) {
    const parts = fromName.trim().split(/\s+/);
    if (parts.length >= 4) return `${parts[0]} ${parts[2]}`.trim();
    return fromName;
  }
  return u.email || "Admin";
}

export function AdminHeader({ user, isReadOnly }: Props) {
  const [open, setOpen] = useState(false);

  const closeMenu = useCallback(() => {
    setOpen(false);
  }, []);

  useCloseOnNav(closeMenu);

  // Bloquear scroll cuando el menú está abierto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-[100] w-full border-b bg-background h-14 grid grid-cols-[1fr_auto_1fr] items-center px-4 pl-2 sm:pl-4 gap-4">
        <div className="flex justify-self-start items-center">
          <Sheet open={open} onOpenChange={setOpen} modal={false}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                className="relative px-2"
                aria-label="Menu"
              >
                <RiMenu2Line
                  className={`size-6 transition-all duration-300 ease-in-out ${
                    open ? "scale-0 opacity-0" : "scale-100 opacity-100"
                  }`}
                />
                <CgClose
                  className={`absolute size-6 transition-all duration-300 ease-in-out ${
                    open ? "scale-100 opacity-100" : "scale-0 opacity-0"
                  }`}
                />
              </Button>
            </SheetTrigger>

            <SheetContent
              side="left"
              className="w-full sm:w-[340px] p-0 outline-none border-r"
            >
              <SheetTitle className="hidden">Admin Menu</SheetTitle>
              <AdminSidebar onClose={closeMenu} />
            </SheetContent>
          </Sheet>
        </div>

        <Link
          href="/"
          className="mx-2 flex justify-self-center px-2 focus:outline-none hover:cursor-pointer"
        >
          <Image
            src="/images/logo.png"
            alt="LSB Shop"
            width={260}
            height={88}
            priority
            className="h-7 w-auto object-contain dark:invert"
          />
        </Link>

        <div className="hidden sm:flex items-center shrink-0 justify-self-end md:pr-2 gap-2">
          {isReadOnly && (
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              Modo solo lectura
            </span>
          )}
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <FaUserShield className="size-5" />
            {adminHeaderDisplayName(user)}
          </h1>
        </div>
      </header>

      {/* Overlay para bloquear contenido debajo del header */}
      <div
        aria-hidden="true"
        onClick={() => open && setOpen(false)}
        className={`fixed inset-x-0 bottom-0 top-14 z-[90] bg-black/40 print:hidden transition-opacity duration-300 ease-in-out
				${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />
    </>
  );
}
