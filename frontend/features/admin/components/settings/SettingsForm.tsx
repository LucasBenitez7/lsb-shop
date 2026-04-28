"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import {
  storeConfigSchema,
  type StoreConfigFormValues,
} from "@/lib/admin/settings-schema";
import { storeConfigToFormValues } from "@/lib/admin/store-form-map";
import { updateStoreConfig } from "@/lib/api/settings";
import { getCloudinaryBannerUploadPreset } from "@/lib/cloudinary-upload-presets";

import { SingleImageUpload } from "../SingleImageUpload";

import type { StoreConfig } from "@/types/store";

const bannerUploadPreset = getCloudinaryBannerUploadPreset();

interface Props {
  initialData: StoreConfig | null;
  readOnly?: boolean;
}

export function SettingsForm({ initialData, readOnly }: Props) {
  const [isPending, startTransition] = useTransition();
  const [uploadCommitVersion, setUploadCommitVersion] = useState(0);
  const [uploadMountKey, setUploadMountKey] = useState(0);

  const defaultValues = useMemo(
    () => storeConfigToFormValues(initialData),
    [initialData],
  );

  const form = useForm<StoreConfigFormValues>({
    resolver: zodResolver(storeConfigSchema),
    defaultValues,
  });

  async function onSubmit(data: StoreConfigFormValues) {
    startTransition(async () => {
      const res = await updateStoreConfig(data);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Configuración guardada correctamente");
        setUploadCommitVersion((v) => v + 1);
      }
    });
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* HERO SECTION */}
          <div className="grid gap-4 md:gap-6 items-start border rounded-xs p-4 md:px-6 bg-background shadow-sm">
            <div className="border-b pb-2">
              <h3 className="text-xl font-semibold">Hero / Portada</h3>
              <p className="text-sm text-muted-foreground">
                Configura las imágenes e información de la sección principal.
              </p>
            </div>

            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="heroTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título Principal</FormLabel>
                    <FormControl>
                      <Input placeholder="" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="heroSubtitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subtítulo</FormLabel>
                    <FormControl>
                      <Input placeholder="" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div
              className="grid gap-6 md:grid-cols-[1fr_1fr] items-start"
              key={`hero-images-${uploadMountKey}`}
            >
              <FormField
                control={form.control}
                name="heroImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Imagen de Portada en pantallas grandes (2:1)
                    </FormLabel>
                    <FormControl>
                      <SingleImageUpload
                        value={field.value}
                        onChangeAction={field.onChange}
                        label="Subir Imagen Desktop"
                        className="aspect-[2/1] w-full"
                        uploadPreset={bannerUploadPreset}
                        disabled={readOnly}
                        commitVersion={uploadCommitVersion}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="justify-start md:justify-center flex items-start">
                <FormField
                  control={form.control}
                  name="heroMobileImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imagen de Portada en Mobile (4:5)</FormLabel>
                      <FormControl>
                        <SingleImageUpload
                          value={field.value}
                          onChangeAction={field.onChange}
                          label="Subir Imagen Mobile"
                          className="aspect-[4/5] w-full h-[350px]"
                          uploadPreset={bannerUploadPreset}
                          disabled={readOnly}
                          commitVersion={uploadCommitVersion}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* SALE BANNER */}
          <div className="grid gap-4 md:gap-6 items-start border rounded-xs p-4 md:px-6 bg-background shadow-sm">
            <div className="border-b pb-2">
              <h3 className="text-xl font-semibold">Banner de Rebajas</h3>
              <p className="text-sm text-muted-foreground">
                Personaliza el banner de promociones.
              </p>
            </div>

            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="saleTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input placeholder="REBAJAS" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div
              className="grid gap-6 md:grid-cols-[1fr_1fr] items-start"
              key={`sale-images-${uploadMountKey}`}
            >
              <FormField
                control={form.control}
                name="saleImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Imagen de Portada en pantallas grandes (2:1)
                    </FormLabel>
                    <FormControl>
                      <SingleImageUpload
                        value={field.value}
                        onChangeAction={field.onChange}
                        label="Subir Imagen Desktop"
                        className="aspect-[2/1] w-full"
                        uploadPreset={bannerUploadPreset}
                        disabled={readOnly}
                        commitVersion={uploadCommitVersion}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="justify-start md:justify-center flex items-start">
                <FormField
                  control={form.control}
                  name="saleMobileImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imagen de Portada en Mobile (4:5)</FormLabel>
                      <FormControl>
                        <SingleImageUpload
                          value={field.value}
                          onChangeAction={field.onChange}
                          label="Subir Imagen Mobile"
                          className="aspect-[4/5] w-full h-[350px]"
                          uploadPreset={bannerUploadPreset}
                          disabled={readOnly}
                          commitVersion={uploadCommitVersion}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {!readOnly && (
            <div className="flex justify-end pt-4 sticky bottom-4 gap-4">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  form.reset(storeConfigToFormValues(initialData));
                  setUploadMountKey((k) => k + 1);
                  toast.info("Cambios descartados");
                }}
                className="w-full sm:w-auto px-5 h-11"
                size="lg"
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={isPending}
                className="w-full sm:w-auto px-5 h-11"
                size="lg"
              >
                {isPending ? <>Guardando...</> : <>Guardar Cambios</>}
              </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}
