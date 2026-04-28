"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { FaPlus, FaCheck, FaXmark } from "react-icons/fa6";
import { toast } from "sonner";

import { useProductPricing } from "@/features/admin/hooks/use-product-pricing";

import { Button, Input, Label } from "@/components/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { quickCreateCategory } from "@/lib/api/categories/mutations";
import { cn } from "@/lib/utils";


import type { ProductFormValues } from "@/lib/products/schema";

type Props = {
  categories: { id: string; name: string }[];
};

export function GeneralSection({ categories: initialCats }: Props) {
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext<ProductFormValues>();

  const [categories, setCategories] = useState(initialCats);
  const [isCreatingCat, setIsCreatingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const selectedCatId = watch("categoryId");

  // Custom Hook para manejo de precios
  const {
    basePriceInput,
    salePriceInput,
    handleBaseChange,
    handleSaleChange,
    discountPercent,
  } = useProductPricing();

  const handleQuickCreateCat = async () => {
    if (!newCatName.trim()) return;
    const res = await quickCreateCategory(newCatName);
    if (res.category) {
      setCategories([...categories, res.category]);
      setValue("categoryId", res.category.id);
      setIsCreatingCat(false);
      setNewCatName("");
      toast.success("Categoría creada");
    } else {
      toast.error(res.error || "Error al crear");
    }
  };

  return (
    <div className="flex flex-col space-y-6 bg-white p-4 rounded-xs border shadow-sm ">
      <h3 className="text-lg font-medium border-b pb-2">Información General</h3>

      <div className="flex flex-col space-y-4 w-full gap-3">
        <div className="space-y-2 flex-1">
          <Label>Nombre del Producto</Label>
          <Input {...register("name")} placeholder="Ej: Camiseta Oversize" />
          {errors.name && (
            <p className="text-red-500 text-xs">{errors.name.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-4 w-full mb-0">
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            {/* INPUT 1: PRECIO BASE / ORIGINAL */}
            <div className="space-y-2 flex-1">
              <Label className="text-foreground">Precio Base / Original</Label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-neutral-500 font-medium">
                  €
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={basePriceInput}
                  onChange={(e) => handleBaseChange(e.target.value)}
                  className="pl-8 bg-white"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                El precio normal o de lista. Si no hay oferta, este es el precio
                de venta.
              </p>
            </div>

            {/* INPUT 2: PRECIO OFERTA (OPCIONAL) */}
            <div className="space-y-2 flex-1">
              <Label className="text-foreground flex items-center gap-2 relative w-51">
                Precio Oferta (Opcional)
                {discountPercent > 0 && (
                  <span className="text-xs font-semibold text-background bg-red-600 px-1.5 py-0.5 absolute right-0">
                    -{discountPercent}%
                  </span>
                )}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-neutral-500 font-medium">
                  €
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Solo si hay descuento"
                  value={salePriceInput}
                  onChange={(e) => handleSaleChange(e.target.value)}
                  className={cn("pl-8 ")}
                />
              </div>
              {errors.compareAtPrice ? (
                <p className="text-red-500 text-xs">
                  {errors.compareAtPrice.message}
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  Si se llena, este será el precio final y el Base aparecerá
                  tachado.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* INPUTS OCULTOS REALES */}
        <input type="hidden" {...register("priceCents")} />
        <input type="hidden" {...register("compareAtPrice")} />
      </div>

      <div className="space-y-2 w-fit">
        <Label>Orden del producto en la lista</Label>
        <Input
          type="number"
          min={0}
          placeholder="Ej: 1"
          {...register("sortOrder")}
          onKeyDown={(e) => {
            if (e.key === "-" || e.key === "e") e.preventDefault();
          }}
          className="max-w-[70px] flex"
        />
        <p className="text-[10px] text-muted-foreground">
          Esto es opcional, el orden por defecto es por fecha de creación.
        </p>
      </div>

      {/* CATEGORÍA */}
      <div className="space-y-2 col-span-2">
        <div className="flex items-center">
          <Label>Categoría</Label>
        </div>

        <div className="flex items-center gap-2">
          {isCreatingCat ? (
            <div className="flex gap-2 items-center animate-in fade-in slide-in-from-left-2 w-full">
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Nombre de la nueva categoría..."
                className="h-9 mr-1"
                autoFocus
              />

              <Button type="button" size="icon" onClick={handleQuickCreateCat}>
                <FaCheck className="size-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => setIsCreatingCat(false)}
              >
                <FaXmark className="size-4" />
              </Button>
            </div>
          ) : (
            <Select
              onValueChange={(val) =>
                setValue("categoryId", val, { shouldValidate: true })
              }
              value={selectedCatId}
            >
              <SelectTrigger className="">
                <SelectValue placeholder="Selecciona una categoría..." />
              </SelectTrigger>
              <SelectContent align="start" className="min-w-[180px]">
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {!isCreatingCat && (
            <Button
              variant={"ghost"}
              type="button"
              onClick={() => setIsCreatingCat(true)}
              className="text-xs flex gap-1 items-center h-9"
            >
              <FaPlus className="size-3" /> Nueva categoría
            </Button>
          )}

          {errors.categoryId && (
            <p className="text-red-500 text-xs">{errors.categoryId.message}</p>
          )}

          <input type="hidden" {...register("categoryId")} />
        </div>
      </div>

      {/* DESCRIPCIÓN */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">
          Descripción
        </Label>
        <Textarea
          {...register("description")}
          placeholder="Detalles del producto, materiales, cuidados..."
          minRows={5}
          className="bg-white"
        />

        {errors.description && (
          <p className="text-red-500 text-xs">{errors.description.message}</p>
        )}
      </div>
    </div>
  );
}
