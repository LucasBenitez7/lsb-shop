"use client";

import { useState } from "react";
import {
  FaPalette,
  FaTags,
  FaWandMagicSparkles,
  FaPlus,
  FaRotate,
} from "react-icons/fa6";
import { ImSpinner8 } from "react-icons/im";

import { Button, Input, Label, Switch } from "@/components/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

import { cn } from "@/lib/utils";

import { useVariantDialog } from "@/features/admin/hooks/use-variant-dialog";

import { ColorChip, SizeChip } from "./VariantChips";

type Props = {
  onGenerate: (variants: any[]) => void;
};

type ItemToDelete = {
  type: "color" | "size";
  id: string;
  name: string;
} | null;

export function VariantGeneratorDialog({ onGenerate }: Props) {
  const [itemToDelete, setItemToDelete] = useState<ItemToDelete>(null);

  const {
    open,
    handleOpenChange,
    isLoadingAttributes,

    // Modos
    isColorDeleteMode,
    setIsColorDeleteMode,
    isSizeDeleteMode,
    setIsSizeDeleteMode,
    isCustomizingColor,

    // Datos
    dbSizes,
    dbColors,
    clothingSizes,
    shoeSizes,

    // Formulario
    selectedPresetColor,
    genSizes,
    genColorName,
    genColorHex,
    genStock,
    customSizeInput,
    duplicateError,
    existingColorMatch,
    isColorUpdate,

    // Acciones
    setGenStock,
    setCustomSizeInput,
    setGenColorName,
    handlePresetChange,
    handleUserHexChange,
    handleUserNameChange,
    addCustomColor,
    handleGenerateClick,
    toggleSize,
    addCustomSize,
    removeAttribute,
  } = useVariantDialog({ onGenerate });

  // Lógica visual del botón de color
  const showAddColorBtn =
    isCustomizingColor || selectedPresetColor === "custom";

  // Título dinámico
  let colorSectionTitle = "Color Seleccionado";
  if (isColorUpdate) colorSectionTitle = "Actualizar Color Existente";
  else if (showAddColorBtn) colorSectionTitle = "Añade un color nuevo";

  const confirmDelete = () => {
    if (!itemToDelete) return;
    removeAttribute(itemToDelete.type, itemToDelete.id, itemToDelete.name);
    setItemToDelete(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button type="button">
            <FaWandMagicSparkles className="size-3.5 mr-2" />
            Generar Variantes
          </Button>
        </DialogTrigger>

        <DialogContent className="md:max-w-xl  max-h-[85vh] mt-6 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generador de Variantes</DialogTitle>
            <DialogDescription>
              Elige el color y las tallas para generar las variantes
            </DialogDescription>
          </DialogHeader>

          {isLoadingAttributes ? (
            <div className="py-10 flex justify-center">
              <ImSpinner8 className="animate-spin size-6 text-neutral-400" />
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* --- SECCIÓN COLORES --- */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <FaPalette className="size-3.5" /> Colores
                  </Label>
                  <div className="flex items-center gap-2 scale-90 origin-right">
                    <Label
                      htmlFor="color-edit"
                      className={cn(
                        "text-xs font-medium transition-colors",
                        isColorDeleteMode ? "text-red-600" : "text-foreground",
                      )}
                    >
                      Modo Borrar
                    </Label>
                    <Switch
                      id="color-edit"
                      checked={isColorDeleteMode}
                      onCheckedChange={setIsColorDeleteMode}
                      className="data-[state=checked]:bg-red-500 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="bg-neutral-50 p-4 rounded-xs border space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {dbColors.length > 0 ? (
                      dbColors.map((c) => (
                        <ColorChip
                          key={c.id}
                          id={c.id}
                          name={c.name}
                          hex={c.hex}
                          isSelected={selectedPresetColor === c.name}
                          isDeleteMode={isColorDeleteMode}
                          hasError={
                            duplicateError === c.name &&
                            !isColorUpdate &&
                            selectedPresetColor !== c.name
                          }
                          onToggle={handlePresetChange}
                          onDelete={(id, name) =>
                            setItemToDelete({ type: "color", id, name })
                          }
                        />
                      ))
                    ) : (
                      <p className="text-xs text-neutral-400 italic py-2">
                        No hay colores guardados.
                      </p>
                    )}
                  </div>

                  <div
                    className={cn(
                      "transition-all duration-200",
                      isColorDeleteMode &&
                        "opacity-50 pointer-events-none grayscale",
                    )}
                  >
                    <Separator className="bg-neutral-200/60 mb-4" />

                    <div>
                      <div className="flex justify-between items-baseline mb-2">
                        <span
                          className={cn(
                            "text-xs font-semibold uppercase transition-colors text-slate-800",
                          )}
                        >
                          {colorSectionTitle}
                        </span>

                        {/* Mensaje de aviso inteligente */}
                        {existingColorMatch && isColorUpdate && (
                          <span className="text-[10px] animate-in fade-in">
                            Se actualizará el tono del{" "}
                            <b>{existingColorMatch.name}</b>
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2 items-center">
                        <div
                          className="relative w-10 h-9 overflow-hidden rounded-xs border shadow-sm shrink-0 cursor-pointer hover:border-neutral-300 transition-colors"
                          style={{ background: genColorHex }}
                          title="Click para cambiar hex"
                        >
                          <input
                            type="color"
                            className="absolute inset-y-[-50%] inset-x-[-50%] w-[200%] h-[200%] cursor-pointer p-0 border-0 opacity-0"
                            value={genColorHex}
                            onChange={(e) =>
                              handleUserHexChange(e.target.value)
                            }
                          />
                        </div>
                        <Input
                          className="h-9 bg-white"
                          placeholder="Nombre (ej: Verde Menta)"
                          value={genColorName}
                          onChange={(e) => handleUserNameChange(e.target.value)}
                        />

                        {/* BOTÓN INTELIGENTE */}
                        <Button
                          className={cn(!showAddColorBtn && "hidden")}
                          type="button"
                          variant={"default"}
                          disabled={!!existingColorMatch && !isColorUpdate}
                          onClick={() =>
                            addCustomColor(genColorName, genColorHex)
                          }
                          title={
                            isColorUpdate
                              ? "Actualizar tono"
                              : "Guardar nuevo color"
                          }
                        >
                          {isColorUpdate ? (
                            <>
                              <FaRotate className="size-4" /> Actualizar
                            </>
                          ) : (
                            <>
                              <FaPlus className="size-4" /> Añadir
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* --- SECCIÓN TALLAS --- */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <FaTags className="size-3.5" /> Tallas
                  </Label>
                  <div className="flex items-center gap-2 scale-90 origin-right">
                    <Label
                      htmlFor="size-edit"
                      className={cn(
                        "text-xs font-medium transition-colors",
                        isSizeDeleteMode ? "text-red-600" : "text-foreground",
                      )}
                    >
                      Modo Borrar
                    </Label>
                    <Switch
                      id="size-edit"
                      checked={isSizeDeleteMode}
                      onCheckedChange={setIsSizeDeleteMode}
                      className="data-[state=checked]:bg-red-500 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="border p-4 rounded-xs space-y-4 bg-neutral-50">
                  {/* Ropa */}
                  <div>
                    <span className="text-xs font-medium text-slate-700 uppercase mb-2 block">
                      Ropa
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {clothingSizes.length > 0 ? (
                        clothingSizes.map((s) => {
                          const dbEntry = dbSizes.find((d) => d.name === s);
                          return (
                            <SizeChip
                              key={s}
                              name={s}
                              dbId={dbEntry?.id}
                              isSelected={genSizes.includes(s)}
                              isDeleteMode={isSizeDeleteMode}
                              onToggle={toggleSize}
                              onDelete={(id, name) =>
                                setItemToDelete({ type: "size", id, name })
                              }
                            />
                          );
                        })
                      ) : (
                        <span className="text-xs text-neutral-400 italic">
                          No hay tallas guardadas.
                        </span>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Calzado */}
                  <div>
                    <span className="text-xs font-medium text-slate-700 uppercase mb-2 block">
                      Calzado
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {shoeSizes.length > 0 ? (
                        shoeSizes.map((s) => {
                          const dbEntry = dbSizes.find((d) => d.name === s);
                          return (
                            <SizeChip
                              key={s}
                              name={s}
                              dbId={dbEntry?.id}
                              isSelected={genSizes.includes(s)}
                              isDeleteMode={isSizeDeleteMode}
                              onToggle={toggleSize}
                              onDelete={(id, name) =>
                                setItemToDelete({ type: "size", id, name })
                              }
                            />
                          );
                        })
                      ) : (
                        <span className="text-xs text-neutral-400 italic">
                          No hay tallas guardadas.
                        </span>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* INPUT TALLAS */}
                  <div
                    className={cn(
                      "transition-all duration-200",
                      isSizeDeleteMode &&
                        "opacity-50 pointer-events-none grayscale",
                    )}
                  >
                    <span className="text-xs font-medium text-slate-700 uppercase mb-1 block">
                      Añade una nueva talla
                    </span>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ej: 6XL, 100ml..."
                        className="h-9 uppercase"
                        value={customSizeInput}
                        onChange={(e) => setCustomSizeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCustomSize();
                          }
                        }}
                      />
                      <Button
                        className={cn(!customSizeInput && "hidden")}
                        type="button"
                        variant="outline"
                        onClick={addCustomSize}
                        title="Guardar nueva talla"
                      >
                        <FaPlus className="size-4 text-slate-600" /> Añadir
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* --- STOCK --- */}
              <div
                className={cn(
                  "space-y-2 transition-opacity duration-200",
                  (isColorDeleteMode || isSizeDeleteMode) &&
                    "opacity-50 pointer-events-none grayscale",
                )}
              >
                <Label>Stock Inicial (para cada variante)</Label>
                <Input
                  type="number"
                  min="0"
                  value={genStock}
                  onChange={(e) =>
                    setGenStock(Math.max(0, Number(e.target.value)))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "-" || e.key === "e") e.preventDefault();
                  }}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cerrar
            </Button>
            <Button
              disabled={isColorDeleteMode || isSizeDeleteMode}
              className={cn(
                "space-y-2 transition-opacity duration-200",
                (isColorDeleteMode || isSizeDeleteMode) &&
                  "opacity-50 pointer-events-none",
              )}
              onClick={handleGenerateClick}
            >
              Generar Variantes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!itemToDelete}
        onOpenChange={(val) => !val && setItemToDelete(null)}
      >
        <AlertDialogContent className="w-[490px]">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar{" "}
              {itemToDelete?.type === "color" ? "el color" : "la talla"}{" "}
              <span className="font-bold text-foreground">
                "{itemToDelete?.name}"
              </span>{" "}
              de la base de datos global.
              <br />
              <br />
              Esta acción no se puede deshacer y desaparecerá de las opciones
              futuras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
