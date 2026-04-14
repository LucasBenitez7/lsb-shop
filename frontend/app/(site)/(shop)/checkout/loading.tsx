import { Container } from "@/components/ui";

export default function CheckoutLoading() {
  return (
    <Container className="px-0">
      <div className="grid lg:grid-cols-[minmax(0,2fr)_minmax(0,0.8fr)] lg:items-start">
        {/* Columna izquierda: header + formulario (skeleton) */}
        <section className="flex flex-col px-4 lg:min-h-screen">
          {/* Header local del checkout (skeleton) */}
          <header className="sticky top-0 z-[100] flex h-[var(--header-h)] w-full items-center border-b bg-background">
            <div className="mx-auto flex h-[var(--header-h)] w-max items-center px-4 sm:px-6">
              <div className="h-6 w-32 rounded bg-neutral-200 animate-pulse" />
            </div>
          </header>

          {/* Contenido principal: skeleton de los pasos */}
          <div className="flex-1 py-4">
            <div className="space-y-4">
              {/* Título del paso */}
              <div className="h-6 w-56 rounded bg-neutral-200 animate-pulse" />

              {/* Tarjetas de envío / formulario */}
              <div className="space-y-3">
                <div className="h-24 rounded-xs bg-neutral-100 animate-pulse" />
                <div className="h-24 rounded-xs bg-neutral-100 animate-pulse" />
                <div className="h-24 rounded-xs bg-neutral-100 animate-pulse" />
              </div>

              {/* Zona de navegación (botones) */}
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="h-4 w-32 rounded bg-neutral-200 animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-9 w-40 rounded-xs bg-neutral-200 animate-pulse" />
                  <div className="hidden h-9 w-40 rounded-xs bg-neutral-100 animate-pulse sm:block" />
                </div>
              </div>
            </div>
          </div>

          {/* Footer local SOLO en desktop (skeleton simple) */}
          <footer className="hidden border-t bg-background py-6 px-4 text-xs text-muted-foreground lg:block">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="h-4 w-64 rounded bg-neutral-200 animate-pulse" />
              <div className="flex gap-3">
                <div className="h-4 w-20 rounded bg-neutral-200 animate-pulse" />
                <div className="h-4 w-20 rounded bg-neutral-200 animate-pulse" />
                <div className="h-4 w-20 rounded bg-neutral-200 animate-pulse" />
              </div>
            </div>
          </footer>
        </section>

        {/* Columna derecha: resumen del pedido (skeleton) */}
        <aside className="lg:sticky lg:top-0">
          <div className="flex h-full flex-col border bg-background lg:h-screen">
            {/* Header del resumen */}
            <header className="shrink-0 px-4">
              <div className="flex items-center justify-between gap-2 py-4">
                <div className="h-6 w-40 rounded bg-neutral-200 animate-pulse" />
                <div className="h-4 w-10 rounded bg-neutral-200 animate-pulse" />
              </div>
            </header>

            {/* Body scrollable: líneas de carrito fake */}
            <div className="flex-1 overflow-y-auto px-4">
              <div className="space-y-3 py-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-2"
                  >
                    <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xs bg-neutral-200 animate-pulse" />
                    <div className="flex h-full flex-col justify-between py-1">
                      <div className="h-4 w-32 rounded bg-neutral-200 animate-pulse" />
                      <div className="h-3 w-24 rounded bg-neutral-200 animate-pulse" />
                      <div className="h-3 w-16 rounded bg-neutral-100 animate-pulse" />
                    </div>
                    <div className="h-4 w-12 rounded bg-neutral-200 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

            {/* Footer del resumen */}
            <footer className="mt-3 shrink-0 border-t px-4">
              <div className="flex items-center justify-between pt-4 text-sm">
                <div className="h-4 w-24 rounded bg-neutral-200 animate-pulse" />
                <div className="h-4 w-16 rounded bg-neutral-200 animate-pulse" />
              </div>
              <div className="flex items-center justify-between pb-6 pt-4 text-base font-semibold">
                <div className="h-5 w-20 rounded bg-neutral-200 animate-pulse" />
                <div className="h-5 w-24 rounded bg-neutral-200 animate-pulse" />
              </div>
            </footer>
          </div>
        </aside>
      </div>

      {/* Footer local SOLO en mobile: skeleton simple */}
      <footer className="mt-6 border-t bg-background py-6 px-4 text-xs text-muted-foreground lg:hidden">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-4 w-56 rounded bg-neutral-200 animate-pulse" />
          <div className="flex gap-3">
            <div className="h-4 w-20 rounded bg-neutral-200 animate-pulse" />
            <div className="h-4 w-20 rounded bg-neutral-200 animate-pulse" />
            <div className="h-4 w-20 rounded bg-neutral-200 animate-pulse" />
          </div>
        </div>
      </footer>
    </Container>
  );
}
