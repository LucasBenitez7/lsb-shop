"use client";

import { FaTrash } from "react-icons/fa6";

import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";

import { cn } from "@/lib/utils";

import { EditImageButton } from "./EditImageButton";

import type { ProductFormValues } from "@/lib/products/schema";
import type { CloudinaryUploadWidgetResults } from "next-cloudinary";
import type { FieldArrayWithId } from "react-hook-form";

type ProductImageField = FieldArrayWithId<ProductFormValues, "images", "id">;

function getImageRowErrorMessage(fieldError: unknown): string | undefined {
  if (!fieldError || typeof fieldError !== "object") return undefined;
  const o = fieldError as Record<string, unknown>;
  if (typeof o.message === "string") return o.message;
  for (const key of ["url", "root", "color"] as const) {
    const inner = o[key];
    if (inner && typeof inner === "object" && "message" in inner) {
      const m = (inner as { message?: unknown }).message;
      if (typeof m === "string") return m;
    }
  }
  return undefined;
}

type ImageRowProps = {
  field: ProductImageField;
  index: number;
  removeAction: (index: number) => void;
  onUpdateAction: (index: number, result: CloudinaryUploadWidgetResults) => void;
  uploadPreset: string | undefined;
  /** RHF nested error for `images[index]` */
  fieldError?: unknown;
  isMain?: boolean;
  onSetMainAction?: () => void;
};

export function ImageRow({
  field,
  index,
  removeAction,
  onUpdateAction,
  uploadPreset,
  fieldError,
  isMain,
  onSetMainAction,
}: ImageRowProps) {
  const errorMessage = getImageRowErrorMessage(fieldError);

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
          title={field.alt ?? undefined}
        >
          {field.alt || "Sin nombre"}
        </p>

        {hasError && (
          <p className="text-[10px] text-red-600 font-bold bg-red-50 rounded px-1 w-fit">
            {errorMessage}
          </p>
        )}

        {onSetMainAction && !isMain && (
          <button
            type="button"
            onClick={onSetMainAction}
            className="text-xs text-neutral-500 hover:text-amber-600 font-medium flex items-center gap-1 w-fit transition-colors hover:cursor-pointer"
          >
            Seleccionar como principal
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
          onSuccessAction={(result) => onUpdateAction(index, result)}
        />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => removeAction(index)}
          className="h-6 px-2 text-xs text-slate-700 active:text-red-600 active:bg-red-50 hover:text-red-600 hover:bg-red-50 flex gap-1.5 items-center justify-start w-full"
        >
          <FaTrash className="size-3" /> Borrar
        </Button>
      </div>
    </div>
  );
}
