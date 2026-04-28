"use client";

import { FaRegTrashCan, FaTrashCan } from "react-icons/fa6";

type CartRemoveButtonProps = {
  onRemove: () => void;
  className?: string;
};

export function RemoveButton({ onRemove, className }: CartRemoveButtonProps) {
  return (
    <button
      type="button"
      className={`
         group relative flex items-center justify-center rounded-xs hover:cursor-pointer
        ${className ?? ""}
      `}
      aria-label="Quitar de la cesta"
      onClick={onRemove}
    >
      {/* Icono outline (normal) */}
      <FaRegTrashCan
        className="size-[18px] text-foreground transition-opacity group-hover:opacity-0"
        aria-hidden="true"
      />

      {/* Icono relleno (hover) */}
      <FaTrashCan
        className="pointer-events-none absolute size-[18px] text-foreground opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden="true"
      />
    </button>
  );
}
