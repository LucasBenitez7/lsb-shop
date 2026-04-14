"use client";

import { FaTrash } from "react-icons/fa6";

import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";

import { cn } from "@/lib/utils";

import { EditImageButton } from "./EditImageButton";

type ImageRowProps = {
  field: any;
  index: number;
  remove: (index: number) => void;
  onUpdate: (index: number, result: any) => void;
  uploadPreset: string | undefined;
  fieldError?: any;
  isMain?: boolean;
  onSetMain?: () => void;
};

export function ImageRow({
  field,
  index,
  remove,
  onUpdate,
  uploadPreset,
  fieldError,
  isMain,
  onSetMain,
}: ImageRowProps) {
  const errObj = fieldError as any;
  const errorMessage =
    errObj?.message ||
    errObj?.url?.message ||
    errObj?.root?.message ||
    errObj?.color?.message;

  const hasError = !!errorMessage;

  return (
    <div
      className={cn(
        "group flex gap-2 items-center p-2 border rounded-xs bg-background transition-all hover:shadow-sm",
        hasError && "border-red-500",
      )}
    >
      {/* 1. THUMBNAIL */}
      <div className="relative h-20 w-14 bg-neutral-100 border rounded-xs shrink-0 overflow-hidden">
        <Image
          src={field.url}
          alt={field.alt || "Imagen del producto"}
          fill
          className="object-cover"
          sizes="80px"
        />
      </div>

      <div className="flex-1 h-full justify-between min-w-0 flex flex-col gap-1 py-1">
        <p
          className="text-sm font-medium text-foreground truncate"
          title={field.alt}
        >
          {field.alt || "Sin nombre"}
        </p>

        {hasError && (
          <p className="text-[10px] text-red-600 font-bold bg-red-50 rounded px-1 w-fit">
            {errorMessage}
          </p>
        )}

        {onSetMain && !isMain && (
          <button
            type="button"
            onClick={onSetMain}
            className="text-xs text-neutral-500 hover:text-amber-600 font-medium flex items-center gap-1 w-fit transition-colors hover:cursor-pointer"
          >
            Selccionar como principal
          </button>
        )}

        {isMain && (
          <div className="text-xs text-amber-600 font-semibold">Principal</div>
        )}
      </div>

      <div
        className={cn(
          "flex flex-col gap-1 border-l pl-1 self-stretch justify-evenly",
        )}
      >
        <EditImageButton
          uploadPreset={uploadPreset}
          onSuccess={(result) => onUpdate(index, result)}
        />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => remove(index)}
          className="h-6 px-2 text-xs text-slate-700 active:text-red-600 active:bg-red-50 hover:text-red-600 hover:bg-red-50 flex gap-1.5 items-center justify-start w-full"
        >
          <FaTrash className="size-3" /> Borrar
        </Button>
      </div>
    </div>
  );
}
