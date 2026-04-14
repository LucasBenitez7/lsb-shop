"use client";

import { FaXmark } from "react-icons/fa6";

import { cn } from "@/lib/utils";

import type { PresetColor, PresetSize } from "@/lib/products/types";

// --- COLOR CHIP ---
interface ColorChipProps extends PresetColor {
  isSelected: boolean;
  isDeleteMode: boolean;
  hasError?: boolean;
  onToggle: (name: string) => void;
  onDelete: (id: string, name: string) => void;
}

export const ColorChip = ({
  id,
  name,
  hex,
  isSelected,
  isDeleteMode,
  hasError,
  onToggle,
  onDelete,
}: ColorChipProps) => {
  const canDelete = isDeleteMode;

  return (
    <div
      onClick={() => !isDeleteMode && onToggle(name)}
      className={cn(
        "group relative flex items-center gap-2 px-3 py-1.5 text-sm border rounded-xs transition-all select-none",

        !isDeleteMode &&
          !isSelected &&
          "bg-background text-slate-700 cursor-pointer hover:border-slate-800",

        !isDeleteMode &&
          isSelected &&
          "bg-slate-900 text-white border-slate-900",

        isDeleteMode &&
          "cursor-default bg-background text-slate-400 border-neutral-200",

        hasError && !isSelected && "border-red-500 text-red-700 bg-red-50",
      )}
    >
      <div
        className={cn(
          "w-3 h-3 rounded-full border",
          isSelected ? "border-slate-600" : "border-neutral-300",
        )}
        style={{ background: hex }}
      />

      {name}

      {canDelete && (
        <div
          role="button"
          className="absolute -top-2 -right-2 flex h-5 w-5 bg-red-500 text-white rounded-full items-center justify-center shadow-sm hover:bg-red-600 z-10 animate-in zoom-in duration-200 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(id, name);
          }}
          title="Borrar color"
        >
          <FaXmark className="size-3" />
        </div>
      )}
    </div>
  );
};

// --- SIZE CHIP ---
interface SizeChipProps extends Partial<PresetSize> {
  name: string;
  dbId?: string;
  isSelected: boolean;
  isDeleteMode: boolean;
  onToggle: (name: string) => void;
  onDelete: (id: string, name: string) => void;
}

export const SizeChip = ({
  name,
  dbId,
  isSelected,
  isDeleteMode,
  onToggle,
  onDelete,
}: SizeChipProps) => {
  const canDelete = isDeleteMode && !!dbId;

  return (
    <div
      onClick={() => !isDeleteMode && onToggle(name)}
      className={cn(
        "group relative flex items-center justify-center px-3 py-1.5 text-sm border rounded-xs transition-all select-none",

        !isDeleteMode &&
          !isSelected &&
          "bg-background text-slate-700 cursor-pointer hover:border-slate-800",

        !isDeleteMode &&
          isSelected &&
          "bg-slate-900 text-white border-slate-900",

        isDeleteMode &&
          "cursor-default bg-background text-slate-400 border-neutral-200",
      )}
    >
      {name}
      {canDelete && (
        <div
          role="button"
          className="absolute -top-2 -right-2 flex h-5 w-5 bg-red-500 text-white rounded-full items-center justify-center shadow-sm hover:bg-red-600 z-10 animate-in zoom-in duration-200 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(dbId!, name);
          }}
          title="Borrar talla"
        >
          <FaXmark className="size-3" />
        </div>
      )}
    </div>
  );
};
