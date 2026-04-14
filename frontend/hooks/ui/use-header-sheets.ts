"use client";

import { useState, useCallback, useEffect, useRef } from "react";

import { useCloseOnNav } from "@/hooks/common/use-close-on-nav";
import { useCartStore } from "@/store/useCartStore";

/**
 * Gestiona el estado de los sheets del header (sidebar, búsqueda, carrito),
 * su exclusión mutua y los efectos de compensación de scrollbar.
 */
export function useHeaderSheets(pathname: string) {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const scrollbarWidthRef = useRef(0);

  const isCartOpen = useCartStore((s) => s.isOpen);
  const closeCart = useCartStore((s) => s.closeCart);

  const closeMenu = useCallback(() => setOpen(false), []);
  useCloseOnNav(closeMenu);

  // Exclusión mutua: si el carrito abre, cierra sidebar y buscador.
  useEffect(() => {
    if (isCartOpen) {
      setOpen(false);
      setSearchOpen(false);
    }
  }, [isCartOpen]);

  // Exclusión mutua: si el sidebar abre, cierra carrito y buscador.
  useEffect(() => {
    if (open) {
      closeCart();
      setSearchOpen(false);
    }
  }, [open, closeCart]);

  // Exclusión mutua: si el buscador abre, cierra sidebar y carrito.
  useEffect(() => {
    if (searchOpen) {
      setOpen(false);
      closeCart();
    }
  }, [searchOpen, closeCart]);

  useEffect(() => {
    const sw = window.innerWidth - document.documentElement.clientWidth;
    scrollbarWidthRef.current = sw;
    document.documentElement.style.setProperty("--sw", `${sw}px`);
  }, [pathname]);

  useEffect(() => {
    const restore = () => {
      document.body.style.overflow = "";
      document.documentElement.style.removeProperty("--content-max-w");
      document.documentElement.style.setProperty(
        "--sw",
        `${scrollbarWidthRef.current}px`,
      );
    };

    if (open) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.setProperty("--content-max-w", "none");
      document.documentElement.style.setProperty("--sw", "0px");
    } else {
      restore();
    }

    return restore;
  }, [open]);

  return {
    open,
    setOpen,
    searchOpen,
    setSearchOpen,
    accountMenuOpen,
    setAccountMenuOpen,
    closeMenu,
    isCartOpen,
  };
}
