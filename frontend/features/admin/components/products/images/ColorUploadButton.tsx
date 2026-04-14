"use client";

import { CldUploadWidget } from "next-cloudinary";
import { useEffect, useState } from "react";
import { FaCloudArrowUp } from "react-icons/fa6";
import { ImSpinner8 } from "react-icons/im";

import { Button } from "@/components/ui/button";

type Props = {
  uploadPreset: string | undefined;
  colorName: string;
  onUpload: (result: any) => void;
};

export function ColorUploadButton({ uploadPreset, onUpload }: Props) {
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
      signatureEndpoint="/api/sign-cloudinary-params"
      options={{
        maxFiles: 10,
        sources: ["local", "url", "camera"],
      }}
      onSuccess={(result) => {
        setIsOpening(false);
        fixScrollLock();
        onUpload(result);
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
            onClick={(e) => {
              e.preventDefault();
              setIsOpening(true);
              setTimeout(() => {
                open();
              }, 50);
            }}
            disabled={isBusy}
            variant="default"
          >
            {isBusy ? (
              <ImSpinner8 className="size-4 animate-spin" />
            ) : (
              <FaCloudArrowUp className="size-4" />
            )}
            {isBusy ? "Cargando..." : `Añadir Imágenes`}
          </Button>
        );
      }}
    </CldUploadWidget>
  );
}
