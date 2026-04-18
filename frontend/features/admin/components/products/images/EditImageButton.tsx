"use client";

import { CldUploadWidget, type CloudinaryUploadWidgetResults } from "next-cloudinary";
import { useEffect, useState } from "react";
import { FaPencil } from "react-icons/fa6";
import { ImSpinner8 } from "react-icons/im";

import { Button } from "@/components/ui/button";

import { getCloudinarySignatureEndpoint } from "@/lib/cloudinary-upload-presets";

type Props = {
  uploadPreset: string | undefined;
  onSuccessAction: (result: CloudinaryUploadWidgetResults) => void;
};

export function EditImageButton({ uploadPreset, onSuccessAction }: Props) {
  const [isOpening, setIsOpening] = useState(false);

  const fixScrollLock = () => {
    document.body.style.overflow = "auto";
    document.body.style.removeProperty("overflow");
  };

  useEffect(() => {
    return () => fixScrollLock();
  }, []);

  return (
    <CldUploadWidget
      uploadPreset={uploadPreset}
      signatureEndpoint={getCloudinarySignatureEndpoint()}
      options={{
        maxFiles: 1,
        sources: ["local", "url", "camera"],
      }}
      onSuccess={(result: CloudinaryUploadWidgetResults) => {
        setIsOpening(false);
        fixScrollLock();
        onSuccessAction(result);
      }}
      onOpen={() => {
        setIsOpening(false);
      }}
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isBusy}
            onClick={(e) => {
              e.preventDefault();
              setIsOpening(true);
              setTimeout(() => {
                open();
              }, 50);
            }}
            className="h-6 px-2 text-xs text-slate-700 hover:text-blue-600 hover:bg-blue-50 active:text-blue-600 active:bg-blue-50 flex gap-1.5 items-center justify-start w-full transition-colors"
          >
            {isBusy ? (
              <ImSpinner8 className="size-3 animate-spin text-blue-600" />
            ) : (
              <FaPencil className="size-3" />
            )}
            {isBusy ? "Cargando..." : "Editar"}
          </Button>
        );
      }}
    </CldUploadWidget>
  );
}
