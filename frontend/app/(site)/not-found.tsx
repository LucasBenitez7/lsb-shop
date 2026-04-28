import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <p className="mt-2 text-neutral-600">
        Puede que el enlace esté roto o la página haya sido movida.
      </p>
      <div className="mt-6 flex items-center justify-center gap-6">
        <Link
          href="/"
          className="py-2 px-4 font-medium rounded-xs border border-slate-300 bg-background hover:bg-neutral-100"
        >
          Volver al inicio
        </Link>
        <Link
          href="/catalogo"
          className="py-2 px-4 font-medium rounded-xs border border-slate-300 bg-foreground text-background hover:bg-slate-800"
        >
          Ir al catálogo
        </Link>
      </div>
    </section>
  );
}
