"use client";

import Image from "next/image";
import { CldUploadWidget } from "next-cloudinary";
import { useEffect, useRef, useState } from "react";
import { FaCloudArrowUp, FaPencil, FaTrash } from "react-icons/fa6";
import { ImSpinner8 } from "react-icons/im";

import { Button } from "@/components/ui/button";

import { deleteCloudinaryAsset } from "@/lib/cloudinary-delete-client";
import {
  getCloudinaryProductUploadPreset,
  getCloudinarySignatureEndpoint,
} from "@/lib/cloudinary-upload-presets";
import { cn } from "@/lib/utils";

import type { MutableRefObject } from "react";

function isUploadInfo(
  info: unknown,
): info is { secure_url: string; public_id: string } {
  if (typeof info !== "object" || info === null) return false;
  const o = info as Record<string, unknown>;
  return (
    typeof o.secure_url === "string" &&
    typeof o.public_id === "string" &&
    o.secure_url.length > 0 &&
    o.public_id.length > 0
  );
}

type Props = {
  value?: string | null;
  onChangeAction: (url: string | null) => void;
  label?: string;
  className?: string;
  uploadPreset?: string;
  /** When true, uploads and edits are disabled (e.g. demo read-only). */
  disabled?: boolean;
  /**
   * Set to true in the parent form's onSubmit before the server action runs.
   * Unmount cleanup will skip deleting session uploads (successful save / redirect).
   */
  commitSignalRef?: MutableRefObject<boolean>;
  /**
   * Increment after a successful save so this widget clears its orphan registry
   * without calling Cloudinary delete (e.g. settings form without redirect).
   */
  commitVersion?: number;
};

export function SingleImageUpload({
  value,
  onChangeAction,
  label,
  className,
  uploadPreset,
  disabled = false,
  commitSignalRef,
  commitVersion = 0,
}: Props) {
  const [isOpening, setIsOpening] = useState(false);
  const preset = uploadPreset || getCloudinaryProductUploadPreset();
  const signatureEndpoint = getCloudinarySignatureEndpoint();

  const valueRef = useRef<string | null>(value ?? null);
  useEffect(() => {
    valueRef.current = value ?? null;
  }, [value]);

  /** URLs produced in this widget instance → public_id (for replace/delete). */
  const urlToPublicIdRef = useRef<Map<string, string>>(new Map());
  /** public_ids to destroy on abandon (cancel / refresh / error after submit). */
  const orphanPublicIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (commitVersion <= 0) return;
    urlToPublicIdRef.current.clear();
    orphanPublicIdsRef.current.clear();
  }, [commitVersion]);

  useEffect(() => {
    return () => {
      if (commitSignalRef?.current) return;
      const ids = [...orphanPublicIdsRef.current];
      orphanPublicIdsRef.current.clear();
      urlToPublicIdRef.current.clear();
      for (const id of ids) {
        void deleteCloudinaryAsset(id);
      }
    };
  }, [commitSignalRef]);

  const fixScrollLock = () => {
    document.body.style.overflow = "auto";
    document.body.style.removeProperty("overflow");
  };

  useEffect(() => {
    return () => fixScrollLock();
  }, []);

  const registerSuccessfulUpload = (info: unknown) => {
    if (!isUploadInfo(info)) return;
    const secureUrl = info.secure_url;
    const publicId = info.public_id;
    const prevUrl = valueRef.current;
    if (prevUrl && urlToPublicIdRef.current.has(prevUrl)) {
      const oldPid = urlToPublicIdRef.current.get(prevUrl)!;
      void deleteCloudinaryAsset(oldPid);
      urlToPublicIdRef.current.delete(prevUrl);
      orphanPublicIdsRef.current.delete(oldPid);
    }

    urlToPublicIdRef.current.set(secureUrl, publicId);
    orphanPublicIdsRef.current.add(publicId);
    onChangeAction(secureUrl);
  };

  const handleRemove = () => {
    const current = valueRef.current;
    if (current && urlToPublicIdRef.current.has(current)) {
      const pid = urlToPublicIdRef.current.get(current)!;
      void deleteCloudinaryAsset(pid);
      urlToPublicIdRef.current.delete(current);
      orphanPublicIdsRef.current.delete(pid);
    }
    onChangeAction(null);
  };

  if (disabled) {
    return (
      <div className="space-y-2">
        {value ? (
          <div
            className={cn(
              "relative rounded-xs overflow-hidden border bg-neutral-100",
              className || "aspect-square w-40",
            )}
          >
            <Image
              src={value}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground border rounded-xs p-4 bg-muted/30">
            Sin imagen (solo lectura).
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Las subidas están deshabilitadas en modo solo lectura.
        </p>
      </div>
    );
  }

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
            <CldUploadWidget
              uploadPreset={preset}
              signatureEndpoint={signatureEndpoint}
              options={{
                maxFiles: 1,
                sources: ["local", "url", "camera"],
              }}
              onSuccess={(result) => {
                if (result.info) {
                  registerSuccessfulUpload(result.info);
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

            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              className="h-10 px-4 text-sm bg-background text-foreground hover:bg-red-600 active:bg-red-600 hover:text-background active:text-background"
            >
              <FaTrash className="size-3.5 mr-1" /> Borrar
            </Button>
          </div>
        </div>
      ) : (
        <CldUploadWidget
          uploadPreset={preset}
          signatureEndpoint={signatureEndpoint}
          options={{
            maxFiles: 1,
            sources: ["local", "url", "camera"],
          }}
          onSuccess={(result) => {
            setIsOpening(false);
            fixScrollLock();
            if (result.info) {
              registerSuccessfulUpload(result.info);
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
