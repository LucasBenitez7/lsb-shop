import { FaBoxOpen } from "react-icons/fa";
import { FaInstagram } from "react-icons/fa6";
import { MdEmail, MdChat } from "react-icons/md";

import { Container } from "@/components/ui";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contacto | LSB Shop",
  description:
    "¿Tienes alguna pregunta? Estamos aquí para ayudarte. Contacta con el equipo de LSB Shop.",
};

const CHANNELS = [
  {
    icon: MdEmail,
    title: "Email",
    desc: "Respuesta en menos de 24 h",
    href: "mailto:hola@lsbshop.com",
    cta: "hola@lsbshop.com",
  },
  {
    icon: FaInstagram,
    title: "Instagram",
    desc: "Mándanos un DM, te respondemos rápido",
    href: "https://instagram.com",
    cta: "@lsbshop",
  },
  {
    icon: FaBoxOpen,
    title: "Seguimiento de pedido",
    desc: "Consulta el estado de tu compra",
    href: "/tracking",
    cta: "Rastrear pedido",
  },
  {
    icon: MdChat,
    title: "Devoluciones",
    desc: "Gestiona una devolución desde tu cuenta",
    href: "/account/orders",
    cta: "Ir a mis pedidos",
  },
];

export default function ContactoPage() {
  return (
    <main className="space-y-10 py-10">
      {/* ── HERO ── */}
      <section>
        <Container className="px-4 max-w-2xl mx-auto text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">
            ¿Cómo podemos ayudarte?
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Elige el canal que más te guste. Siempre hay alguien al otro lado.
          </p>
        </Container>
      </section>

      {/* ── CANALES ── */}
      <section>
        <Container className="px-4 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {CHANNELS.map(({ icon: Icon, title, desc, href, cta }) => (
              <a
                key={title}
                href={href}
                className="group flex gap-4 p-5 rounded-xs border hover:border-foreground transition-colors duration-200"
              >
                <div className="shrink-0 flex items-center justify-center size-11 rounded-xs bg-muted">
                  <Icon className="size-5 text-foreground" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="font-semibold text-sm">{title}</p>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                  <span className="mt-1 text-xs underline-offset-4 text-foreground group-hover:underline transition-all">
                    {cta}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </Container>
      </section>

      {/* ── HORARIO ── */}
      <section>
        <Container className="px-4 max-w-2xl mx-auto text-center space-y-2">
          <h2 className="font-semibold text-lg">Horario de atención</h2>
          <p className="text-muted-foreground text-sm">
            Lunes a viernes · 9:00 – 19:00 (CET)
          </p>
          <p className="text-muted-foreground text-sm">
            Los fines de semana respondemos el lunes.
          </p>
        </Container>
      </section>
    </main>
  );
}
