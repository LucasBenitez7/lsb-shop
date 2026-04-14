"use client";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

import { useCartStore } from "@/store/useCartStore";
import { useStore } from "@/store/useStore";

interface Props {
  className?: string;
}

export function CartUndoNotification({ className }: Props) {
  const removedItems = useStore(useCartStore, (state) => state.removedItems);
  const restoreItem = useCartStore((state) => state.restoreItem);
  const dismissLastRemovedItem = useCartStore(
    (state) => state.dismissLastRemovedItem,
  );

  const isRestoring = useRef(false);

  const lastEntry =
    removedItems && removedItems.length > 0
      ? removedItems[removedItems.length - 1]
      : null;

  useEffect(() => {
    if (!lastEntry) return;

    isRestoring.current = false;

    const DURATION = 4000;
    const timeSinceRemoved = Date.now() - lastEntry.removedAt;

    if (timeSinceRemoved >= DURATION) {
      dismissLastRemovedItem();
      return;
    }

    const remainingTime = DURATION - timeSinceRemoved;
    const timerId = setTimeout(() => {
      dismissLastRemovedItem();
    }, remainingTime);

    return () => {
      clearTimeout(timerId);

      const currentStack = useCartStore.getState().removedItems;
      const currentLastEntry =
        currentStack.length > 0 ? currentStack[currentStack.length - 1] : null;

      if (isRestoring.current) return;

      if (
        currentLastEntry &&
        currentLastEntry.item.variantId !== lastEntry.item.variantId
      ) {
        return;
      }

      dismissLastRemovedItem();
    };
  }, [lastEntry, dismissLastRemovedItem]);

  if (!lastEntry) return null;

  return (
    <div
      className={cn(
        "animate-in fade-in slide-in-from-bottom-2 duration-300",
        className,
      )}
    >
      <div className="flex items-center justify-between rounded-xs border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm shadow-sm">
        <div className="flex flex-col">
          <span className="font-medium text-left">Producto eliminado</span>
          <p className="text-neutral-500 text-xs max-w-[300px] truncate">
            {lastEntry.item.name} ({lastEntry.item.size})
          </p>
        </div>

        <button
          onClick={() => {
            isRestoring.current = true;
            restoreItem();
          }}
          className="ml-4 font-semibold hover:underline underline-offset-4 text-sm whitespace-nowrap hover:cursor-pointer"
        >
          Deshacer
        </button>
      </div>
    </div>
  );
}
