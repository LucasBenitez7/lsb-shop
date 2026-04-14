"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaArrowLeft } from "react-icons/fa6";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CheckoutHeader() {
  const router = useRouter();
  const [openDialog, setOpenDialog] = useState(false);
  const [destination, setDestination] = useState<{
    href: string;
    label: string;
  } | null>(null);

  const handleNavigation = (href: string, label: string) => {
    setDestination({ href, label });
    setOpenDialog(true);
  };

  const confirmNavigation = () => {
    if (destination) {
      router.push(destination.href);
    }
    setOpenDialog(false);
  };

  return (
    <>
      <header className="sticky top-0 z-[40] flex h-[var(--header-h)] w-full items-center border-b bg-background">
        <div className="mx-auto grid h-full w-full grid-cols-[1fr_auto_1fr] items-center px-4">
          <div className="flex justify-start">
            <Button
              variant="ghost"
              className="p-2 rounded-xs tip-right"
              onClick={() => handleNavigation("/cart", "Volver a la cesta")}
              data-tip="Volver a la cesta"
            >
              <FaArrowLeft className="size-4" />
            </Button>
          </div>

          <button
            onClick={() => handleNavigation("/catalogo", "Ir a la tienda")}
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
          </button>

          <div />
        </div>
      </header>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              ¿Quieres salir del proceso?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground pt-2 text-sm leading-relaxed">
              Estás a punto de salir del proceso de compra
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-col-reverse gap-4 pt-2 justify-between">
            <Button
              variant="outline"
              onClick={() => setOpenDialog(false)}
              className="font-semibold w-full sm:w-auto px-4 py-2 lg:flex-1"
            >
              Quedarme aquí
            </Button>

            <Button
              variant="default"
              onClick={confirmNavigation}
              className="font-semibold w-full sm:w-auto px-4 py-2 lg:flex-1"
            >
              {destination?.label || "Salir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
