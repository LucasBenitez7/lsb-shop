"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaInstagram,
  FaXTwitter,
  FaTiktok,
  FaPinterest,
} from "react-icons/fa6";

import { Container } from "@/components/ui";

/* ─────────────────────────── datos estáticos ─────────────────────────── */

const SHOP_LINKS = [
  { label: "Catálogo completo", href: "/catalogo" },
  { label: "Novedades", href: "/novedades" },
  { label: "Rebajas", href: "/rebajas" },
  { label: "Sobre nosotros", href: "/sobre-nosotros" },
];

const HELP_LINKS = [
  { label: "¿Cómo podemos ayudarte?", href: "/contacto" },
  { label: "Seguimiento de pedido", href: "/tracking" },
  { label: "Devoluciones", href: "/account/orders?status=RETURNS" },
  { label: "Mis compras", href: "/account/orders" },
  { label: "Contacto", href: "/contacto" },
];

const SOCIAL_LINKS = [
  {
    label: "Instagram",
    href: "https://instagram.com",
    icon: FaInstagram,
  },
  {
    label: "TikTok",
    href: "https://tiktok.com",
    icon: FaTiktok,
  },
  {
    label: "X / Twitter",
    href: "https://x.com",
    icon: FaXTwitter,
  },
  {
    label: "Pinterest",
    href: "https://pinterest.com",
    icon: FaPinterest,
  },
];

/* ────────────────────────── componente Footer ─────────────────────────── */

export function Footer() {
  const pathname = usePathname();

  const isCheckoutFlow: string[] = ["/checkout"];
  if (isCheckoutFlow.includes(pathname)) return null;

  return (
    <footer className="bg-background mt-10">
      {/* ── Cuerpo principal ── */}
      <Container className="py-10 px-6 grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-4 md:flex md:flex-row md:justify-between md:items-start md:gap-8">
        {/* Columna 1 – Marca */}
        <div className="col-span-1 md:col-span-2 flex flex-col gap-3 items-start">
          <Link href="/" aria-label="LSB Shop — Inicio">
            <Image
              src="/images/logo.png"
              alt="LSB Shop"
              width={180}
              height={60}
              className="h-5 w-auto object-contain dark:invert"
            />
          </Link>
          <p className="text-sm text-foreground leading-relaxed max-w-[220px]">
            Moda moderna con estilo propio. Prendas cuidadosamente seleccionadas
            para tu día a día.
          </p>
        </div>

        {/* Columna 2 – Ayuda */}
        <FooterColumn title="Ayuda" links={HELP_LINKS} />

        {/* Columna 3 – Tienda */}
        <FooterColumn title="Tienda" links={SHOP_LINKS} />

        {/* Columna 4 – Redes sociales */}
        <div className="flex flex-col gap-3 items-start">
          <p className="text-sm font-semibold text-foreground">Síguenos</p>
          <ul className="flex flex-col gap-2">
            {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
              <li
                key={label}
                className="hover:cursor-pointer border-b border-background hover:border-foreground"
              >
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-row items-center gap-2 text-sm"
                >
                  <Icon className="size-[15px]" />
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </Container>

      {/* ── Barra inferior ── */}
      <Container className="py-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm px-4">
        <p>
          © {new Date().getFullYear()} lsbshop. Todos los derechos reservados.
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="/privacidad"
            className="hover:underline underline-offset-4 text-sm"
          >
            Política de Privacidad y Cookies
          </Link>
          <Link
            href="/terminos"
            className="hover:underline underline-offset-4 text-sm"
          >
            Términos y Condiciones
          </Link>
        </div>
      </Container>
    </footer>
  );
}

/* ──────────────────────── sub-componente columna ──────────────────────── */

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div className="flex flex-col gap-3 items-start">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <ul className="flex flex-col gap-2">
        {links.map(({ label, href }) => (
          <li key={label}>
            <Link
              href={href}
              className="text-sm hover:underline underline-offset-4 text-foreground"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
