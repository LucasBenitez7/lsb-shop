import Link from "next/link";

export function CheckoutLocalFooter() {
  return (
    <footer className="border-t bg-background py-6 px-4 md:px-6 text-xs text-foreground lg:block">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs">
        <p>
          © {new Date().getFullYear()} lsbshop. Todos los derechos reservados.
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="/privacidad"
            className="hover:underline underline-offset-4 text-xs"
          >
            Política de Privacidad y Cookies
          </Link>
          <Link
            href="/terminos"
            className="hover:underline underline-offset-4 text-xs"
          >
            Términos y Condiciones
          </Link>
        </div>
      </div>
    </footer>
  );
}
