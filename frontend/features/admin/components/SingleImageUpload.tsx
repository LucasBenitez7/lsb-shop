"use client";

import Image from "next/image";
import { CldUploadWidget } from "next-cloudinary";
import { useEffect, useState } from "react";
import { FaCloudArrowUp, FaPencil, FaTrash } from "react-icons/fa6";
import { ImSpinner8 } from "react-icons/im";

import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

type Props = {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  className?: string;
  uploadPreset?: string;
};

export function SingleImageUpload({
  value,
  onChange,
  label,
  className,
  uploadPreset,
}: Props) {
  const [isOpening, setIsOpening] = useState(false);
  const preset =
    uploadPreset || process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  const fixScrollLock = () => {
    document.body.style.overflow = "auto";
    document.body.style.removeProperty("overflow");
  };

  useEffect(() => {
    return () => fixScrollLock();
  }, []);

  return (
    <div className="space-y-4">
      {value ? (
        <div className="flex flex-col sm:flex-row gap-4 items-start mb-6 sm:mb-0">
          <div
            className={cn(
              "relative rounded-xs overflow-hidden border bg-neutral-100",
              className || "aspect-square w-40",
            )}
          >
            <Image
              src={value}
              alt="Uploaded image"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
          <div className="flex flex-row sm:flex-col gap-2">
            {/* EDITAR (REEMPLAZAR) */}
            <CldUploadWidget
              uploadPreset={preset}
              signatureEndpoint="/api/sign-cloudinary-params"
              options={{
                maxFiles: 1,
                sources: ["local", "url", "camera"],
              }}
              onSuccess={(result: any) => {
                if (result.info?.secure_url) {
                  onChange(result.info.secure_url);
                }
                fixScrollLock();
              }}
              onOpen={() => setIsOpening(false)}
              onClose={() => fixScrollLock()}
            >
              {({ open, isLoading: scriptLoading }) => {
                const isBusy = scriptLoading || isOpening;
                return (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    disabled={isBusy}
                    onClick={(e) => {
                      e.preventDefault();
                      setIsOpening(true);
                      setTimeout(() => {
                        open();
                      }, 50);
                    }}
                    className="h-10 px-4 text-sm bg-background text-foreground hover:bg-blue-600 active:bg-blue-600 hover:text-background active:text-background"
                  >
                    {isBusy ? (
                      <ImSpinner8 className="size-3.5 animate-spin text-foreground" />
                    ) : (
                      <FaPencil className="size-3.5 mr-1" />
                    )}
                    {isBusy ? "Cargando..." : "Editar"}
                  </Button>
                );
              }}
            </CldUploadWidget>

            {/* ELIMINAR */}
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => onChange(null)}
              className="h-10 px-4 text-sm bg-background text-foreground hover:bg-red-600 active:bg-red-600 hover:text-background active:text-background"
            >
              <FaTrash className="size-3.5 mr-1" /> Borrar
            </Button>
          </div>
        </div>
      ) : (
        <CldUploadWidget
          uploadPreset={preset}
          signatureEndpoint="/api/sign-cloudinary-params"
          options={{
            maxFiles: 1,
            sources: ["local", "url", "camera"],
          }}
          onSuccess={(result: any) => {
            setIsOpening(false);
            fixScrollLock();
            if (result.info?.secure_url) {
              onChange(result.info.secure_url);
            }
          }}
          onOpen={() => setIsOpening(false)}
          onClose={() => {
            setIsOpening(false);
            fixScrollLock();
          }}
          onError={() => {
            setIsOpening(false);
            fixScrollLock();
          }}
        >
          {({ open, isLoading: scriptLoading }) => {
            const isBusy = scriptLoading || isOpening;
            return (
              <div
                className={cn(
                  "border rounded-xs flex flex-col items-center justify-center gap-3 bg-neutral-50",
                  className || "aspect-square w-40",
                )}
              >
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsOpening(true);
                    setTimeout(() => open(), 50);
                  }}
                  disabled={isBusy}
                  variant="default"
                  className="gap-2 h-10 px-4"
                >
                  {isBusy ? (
                    <ImSpinner8 className="size-4 animate-spin" />
                  ) : (
                    <FaCloudArrowUp className="size-4" />
                  )}
                  {label || "Subir Imagen"}
                </Button>
                <p className="text-xs text-muted-foreground text-center px-4">
                  Formato recomendado: .jpg, .png, .webp
                </p>
              </div>
            );
          }}
        </CldUploadWidget>
      )}
    </div>
  );
}
