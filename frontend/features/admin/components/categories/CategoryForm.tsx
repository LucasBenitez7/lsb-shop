"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { FaArrowUpRightFromSquare } from "react-icons/fa6";
import { toast } from "sonner";

import { SingleImageUpload } from "@/features/admin/components/SingleImageUpload";

import { Button, Input, Label, Switch } from "@/components/ui";

import {
  createCategoryAction,
  updateCategoryAction,
  type CategoryFormState,
} from "@/lib/api/categories/mutations";
import { getCloudinaryBannerUploadPreset } from "@/lib/cloudinary-upload-presets";

import { CategorySortPreview } from "./CategorySortPreview";

type Props = {
  category?: {
    id: string;
    name: string;
    slug: string;
    sort: number;
    isFeatured?: boolean;
    image?: string | null;
    mobileImage?: string | null;
  };
  existingCategories?: {
    id: string;
    name: string;
    sort: number;
    isFeatured?: boolean;
  }[];
  readOnly?: boolean;
};

const INITIAL_STATE: CategoryFormState = {
  message: "",
  errors: {},
};

const bannerUploadPreset = getCloudinaryBannerUploadPreset();

export function CategoryForm({
  category,
  existingCategories = [],
  readOnly,
}: Props) {
  const commitSignalRef = useRef(false);
  const [imageUrl, setImageUrl] = useState<string | null>(
    category?.image || null,
  );
  const [mobileImageUrl, setMobileImageUrl] = useState<string | null>(
    category?.mobileImage || null,
  );
  const [isFeatured, setIsFeatured] = useState(!!category?.isFeatured);
  const isEditing = !!category;

  const action = isEditing
    ? updateCategoryAction.bind(null, category.id)
    : createCategoryAction;

  const [state, formAction, isPending] = useActionState<
    CategoryFormState,
    FormData
  >(action, INITIAL_STATE);

  useEffect(() => {
    if (state.message) {
      toast.error(state.message);
      commitSignalRef.current = false;
    }
    if (state.errors && Object.keys(state.errors).length > 0) {
      toast.error("Revisa los campos marcados.");
      commitSignalRef.current = false;
    }
  }, [state]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr] items-start">
      {/* COLUMNA IZQUIERDA */}
      <div className="lg:block">
        <CategorySortPreview
          existingCategories={existingCategories}
          currentId={category?.id}
        />
      </div>

      {/* COLUMNA DERECHA*/}
      <form
        action={formAction}
        onSubmit={() => {
          commitSignalRef.current = true;
        }}
        className="space-y-4"
      >
        <div className="grid space-y-6 bg-background px-4 py-6 rounded-xs border shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="name" className="w-fit pointer-events-none">
              Nombre
            </Label>
            <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
              {isEditing && category?.slug ? (
                <input type="hidden" name="slug" value={category.slug} />
              ) : null}
              <Input
                id="name"
                name="name"
                defaultValue={category?.name}
                placeholder="Ej: Zapatillas"
                autoFocus={!isEditing}
                aria-invalid={!!state.errors?.name}
                className={state.errors?.name ? "border-red-500" : ""}
              />
              {isEditing && (
                <Link
                  href={`/cat/${category?.slug}`}
                  target="_blank"
                  className="text-xs fx-underline-anim font-medium mt-2"
                >
                  Ver en Tienda
                  <span>
                    <FaArrowUpRightFromSquare className="size-3.5 inline-block mb-1 ml-2" />
                  </span>
                </Link>
              )}
            </div>
            {state.errors?.name && (
              <p className="text-red-500 text-xs">{state.errors.name[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sort" className="w-fit pointer-events-none">
              Prioridad (Orden)
            </Label>
            <Input
              id="sort"
              name="sort"
              type="number"
              min={0}
              defaultValue={category?.sort ?? 0}
              onKeyDown={(e) => {
                if (e.key === "-" || e.key === "e") e.preventDefault();
              }}
              className="max-w-[120px]"
            />
            <p className="text-xs text-muted-foreground">
              Menor número = Más arriba en el menú.
            </p>
          </div>
        </div>

        <div className="flex flex-col rounded-xs border p-4 shadow-sm bg-background">
          <div className="flex flex-row items-center justify-between ">
            <div className="space-y-0.5">
              <Label
                htmlFor="isFeatured"
                className="text-base font-semibold text-foreground flex items-center gap-2"
              >
                Destacada en Home
              </Label>
              <p className="text-xs text-muted-foreground">
                Activa esto si quieres que esta categoría aparezca en la sección
                principal de la tienda.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isFeatured"
                checked={isFeatured}
                onCheckedChange={setIsFeatured}
                className="data-[state=checked]:bg-yellow-500 hover:cursor-pointer"
              />
              <input
                type="hidden"
                name="isFeatured"
                value={isFeatured ? "on" : "off"}
              />
            </div>
          </div>

          <div className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-4">
            <div className="space-y-2 pt-4 border-t mt-4">
              <Label>Imagen de Portada en pantallas grandes (4:3)</Label>
              <SingleImageUpload
                value={imageUrl}
                onChangeAction={setImageUrl}
                label="Subir Imagen (4:3)"
                className="aspect-[4/3] w-full max-w-[500px]"
                uploadPreset={bannerUploadPreset}
                disabled={readOnly}
                commitSignalRef={commitSignalRef}
              />
              <p className="text-xs text-muted-foreground">
                Se recomienda una imagen en formato rectangular 4:3. Esta imagen
                se usará en la grilla de la home, si no se sube, se usará la del
                último producto.
              </p>
            </div>

            <div className="space-y-2 pt-6 border-t">
              <Label>Imagen de Portada en Mobile (4:5)</Label>
              <SingleImageUpload
                value={mobileImageUrl}
                onChangeAction={setMobileImageUrl}
                label="Subir Imagen Mobile"
                className="aspect-[4/5] w-full max-w-[300px]"
                uploadPreset={bannerUploadPreset}
                disabled={readOnly}
                commitSignalRef={commitSignalRef}
              />
              <p className="text-xs text-muted-foreground">
                Se recomienda formato vertical 4:5. Si no se sube, se usará la
                imagen de portada de pantallas grandes o la del último producto.
              </p>
            </div>
          </div>

          <input type="hidden" name="image" value={imageUrl || ""} />
          <input
            type="hidden"
            name="mobileImage"
            value={mobileImageUrl || ""}
          />
        </div>

        {!readOnly && (
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              asChild
              type="button"
              className="p-3 px-6 flex-1 lg:flex-0"
            >
              <Link href="/admin/categories">Cancelar</Link>
            </Button>
            <Button
              type="submit"
              variant={"default"}
              disabled={isPending}
              className="p-3 px-6 flex-1 lg:flex-0"
            >
              {isPending ? "Guardando..." : isEditing ? "Guardar" : "Crear"}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
