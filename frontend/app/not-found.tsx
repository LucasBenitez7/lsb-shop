import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">404 — Página no encontrada</h1>
      <p className="mt-2 text-neutral-600">No pudimos encontrar esa ruta.</p>
      <div className="mt-6">
        <Link
          href="/"
          className="py-2 px-4 font-medium rounded-xs bg-foreground hover:bg-foreground/80 text-background"
        >
          Ir al inicio
        </Link>
      </div>
    </section>
  );
}
