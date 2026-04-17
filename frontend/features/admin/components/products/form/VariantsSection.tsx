"use client";

import { useFormContext } from "react-hook-form";
import { FaTrash, FaLayerGroup, FaTriangleExclamation } from "react-icons/fa6";

import { Button, Input } from "@/components/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { type ProductFormValues } from "@/lib/products/schema";
import { cn } from "@/lib/utils";

import { useVariantsTable } from "@/features/admin/hooks/use-variants-table";

import { VariantGeneratorDialog } from "./VariantGeneratorDialog";

export function VariantsSection() {
  const {
    register,
    setValue,
    trigger,
    formState: { errors },
    getValues,
  } = useFormContext<ProductFormValues>();

  const { fields, groupedVariants, remove, addVariants, updateColorOrder } =
    useVariantsTable();

  return (
    <div className="bg-background p-4 rounded-xs border shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-3">
        <div className="flex flex-col text-left">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <FaLayerGroup className="size-4" /> Inventario y Variantes
          </h3>

          <p className="text-xs text-muted-foreground font-medium">
            Crea los colores y tallas e inserta el orden de los colores para la
            vista en tienda
          </p>
        </div>

        <VariantGeneratorDialog onGenerate={addVariants} />
      </div>

      {errors.variants && !Array.isArray(errors.variants) && (
        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xs border border-red-100 flex items-center gap-2 animate-in fade-in">
          <FaTriangleExclamation />
          {(errors.variants as any).message}
        </div>
      )}

      <div className="rounded-xs border overflow-hidden">
        <Table>
          <TableHeader className="bg-neutral-50">
            <TableRow>
              <TableHead className="w-[180px]">ORDEN / COLOR</TableHead>
              <TableHead className="w-[140px] pl-3">TALLA</TableHead>
              <TableHead className="w-[120px] pl-3">STOCK</TableHead>
              <TableHead className="w-[80px] text-right">BORRAR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedVariants.colorOrder.map((colorName) => {
              const groupIndices = groupedVariants.groups[colorName];

              const firstVariantIndex = groupIndices[0];
              const currentColorOrder =
                getValues(`variants.${firstVariantIndex}.colorOrder`) || 0;

              return groupIndices.map((fieldIndex, i) => {
                const isFirstInGroup = i === 0;
                const field = fields[fieldIndex];

                // Errores
                const rowError = errors.variants?.[fieldIndex];
                const groupError = errors.variants?.[firstVariantIndex];
                const orderErrorMessage = (groupError as any)?.colorOrder
                  ?.message;

                return (
                  <TableRow
                    key={field.keyId || field.id}
                    className="group border-b"
                  >
                    {isFirstInGroup && (
                      <TableCell
                        rowSpan={groupIndices.length}
                        className="align-center border-r p-3"
                      >
                        <div className="flex items-center gap-3 sticky top-4">
                          {/* INPUT DE ORDEN (Nuevo) */}
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "text-[10px] uppercase font-bold tracking-wide",
                                orderErrorMessage
                                  ? "text-red-600"
                                  : "text-muted-foreground",
                              )}
                            >
                              Orden:
                            </span>
                            <div className="relative">
                              <Input
                                type="number"
                                className={cn(
                                  "h-7 w-12 text-xs bg-white pr-1",
                                  orderErrorMessage &&
                                    "border-red-500 bg-red-50 text-red-700 focus-visible:ring-red-500 placeholder:text-red-300",
                                )}
                                defaultValue={currentColorOrder}
                                min={0}
                                onKeyDown={(e) => {
                                  if (e.key === "-" || e.key === "e")
                                    e.preventDefault();
                                }}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  updateColorOrder(
                                    colorName,
                                    isNaN(val) ? 0 : Math.max(0, val),
                                  );
                                }}
                                title={
                                  orderErrorMessage ||
                                  "Prioridad de visualización (Menor sale primero)"
                                }
                              />
                            </div>
                          </div>

                          {/* INFO DEL COLOR */}
                          <div className="flex gap-2 items-center">
                            <div
                              className={cn(
                                "h-5 w-5 rounded-full border shrink-0",
                                rowError?.color && "border-red-500",
                              )}
                              style={{
                                backgroundColor: field.colorHex || "#ffffff",
                              }}
                            />
                            <p className="font-medium text-sm text-foreground break-words leading-tight">
                              {colorName}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    )}

                    {/* COLUMNA TALLA */}
                    <TableCell className="align-middle p-2">
                      <Input
                        {...register(`variants.${fieldIndex}.size`)}
                        className={cn(
                          "h-8 uppercase",
                          rowError?.size && "border-red-500 bg-red-50",
                        )}
                        onChange={(e) => {
                          setValue(
                            `variants.${fieldIndex}.size`,
                            e.target.value.toUpperCase(),
                          );
                          trigger("variants");
                        }}
                      />
                    </TableCell>

                    {/* COLUMNA STOCK */}
                    <TableCell className="align-middle p-2">
                      <Input
                        type="number"
                        min="0"
                        {...register(`variants.${fieldIndex}.stock`, {
                          valueAsNumber: true,
                        })}
                        onKeyDown={(e) => {
                          if (e.key === "-" || e.key === "e")
                            e.preventDefault();
                        }}
                        className={cn(
                          "h-8",
                          rowError?.stock && "border-red-500 bg-red-50",
                        )}
                      />
                    </TableCell>

                    {/* COLUMNA ACCIONES */}
                    <TableCell className="text-right align-middle px-5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(fieldIndex)}
                        className="h-8 w-8 text-neutral-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <FaTrash className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              });
            })}

            {fields.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-32 text-center text-neutral-400"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FaLayerGroup className="h-8 w-8 opacity-20" />
                    <p>No hay variantes añadidas</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
