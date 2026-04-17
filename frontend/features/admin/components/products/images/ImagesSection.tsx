"use client";

import { FaTriangleExclamation, FaImages } from "react-icons/fa6";

import { getCloudinaryProductUploadPreset } from "@/lib/cloudinary-upload-presets";
import { cn } from "@/lib/utils";

import { useProductImages } from "@/features/admin/hooks/use-product-images";

import { ColorUploadButton } from "./ColorUploadButton";
import { ImageRow } from "./ImageRow";

export function ImagesSection() {
  const {
    activeColors,
    colorMap,
    groupedImages,
    errors,
    remove,
    handleUpdateImage,
    handleAddImages,
    handleSetMain,
  } = useProductImages();

  const uploadPreset = getCloudinaryProductUploadPreset();

  return (
    <div className="bg-white p-4 rounded-xs border shadow-sm space-y-4">
      {/* HEADER */}
      <div className="border-b pb-2">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <FaImages className="size-4" /> Gestión de Imágenes
        </h3>
        {errors.images?.message &&
          typeof errors.images.message === "string" && (
            <div className="mb-1 mt-2 text-xs font-medium text-red-600 bg-red-50 px-3 py-2 rounded-xs border border-red-100 flex items-center gap-2 w-fit animate-in fade-in">
              <FaTriangleExclamation /> {errors.images.message}
            </div>
          )}
      </div>

      <div className="space-y-4">
        {/* 1. IMÁGENES RESIDUALES (Sin Color) */}
        {groupedImages.unassigned.length > 0 && (
          <div className="border-2 border-dashed border-orange-200 bg-orange-50/30 rounded-xs p-4 transition-all">
            <h4 className="text-sm font-bold text-orange-800 flex items-center gap-2 mb-3">
              <FaTriangleExclamation className="size-4" /> Imágenes residuales
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {groupedImages.unassigned.map((item) => {
                const fieldError = errors.images?.[item.index];

                return (
                  <ImageRow
                    key={item.field.id}
                    field={item.field}
                    index={item.index}
                    removeAction={remove}
                    onUpdateAction={handleUpdateImage}
                    uploadPreset={uploadPreset}
                    fieldError={fieldError}
                    isMain={false}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* 2. CARPETAS POR COLOR */}
        {activeColors.map((colorName) => {
          const groupItems = groupedImages.groups[colorName] || [];
          const hasImages = groupItems.length > 0;
          const hexCode = colorMap.get(colorName) || "#ccc";

          return (
            <div
              key={colorName}
              className={cn(
                "rounded-xs border px-2 py-4 transition-all bg-neutral-50",
              )}
            >
              <div className="flex justify-between items-center gap-4 mb-4">
                {/* Info del Color */}
                <div className="flex items-center gap-2 w-full">
                  <div
                    className="w-6 h-6 rounded-full border"
                    style={{ backgroundColor: hexCode }}
                  />
                  <div>
                    <h4 className="font-semibold text-base text-foreground flex items-center gap-3">
                      {colorName} ({groupItems.length})
                    </h4>
                  </div>
                </div>

                <ColorUploadButton
                  uploadPreset={uploadPreset}
                  colorName={colorName}
                  onUploadAction={(result) => handleAddImages(result, colorName)}
                />
              </div>

              {/* GRID DE FOTOS */}
              <div className="grid grid-cols-1 gap-3">
                {hasImages ? (
                  groupItems.map((item, groupIndex) => {
                    const fieldError = errors.images?.[item.index];

                    const isMain = groupIndex === 0;

                    return (
                      <ImageRow
                        key={item.field.id}
                        field={item.field}
                        index={item.index}
                        removeAction={remove}
                        onUpdateAction={handleUpdateImage}
                        uploadPreset={uploadPreset}
                        fieldError={fieldError}
                        isMain={isMain}
                        onSetMainAction={() => handleSetMain(item.index, colorName)}
                      />
                    );
                  })
                ) : (
                  <div className="col-span-full py-10 text-center text-sm text-muted-foreground border-2 border-dashed border-neutral-200 rounded-xs bg-white">
                    <p>No hay imágenes para el color {colorName}.</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {activeColors.length === 0 && (
          <div className="py-12 text-center text-muted-foreground bg-neutral-50 rounded-xs border border-dashed">
            <p>
              Genera variantes primero para habilitar la subida de imágenes por
              color.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
