import { Container } from "@/components/ui";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sobre Nosotros | LSB Shop",
  description:
    "Conoce la historia, los valores y el equipo detrás de LSB Shop. Moda moderna con estilo propio.",
};

const VALUES = [
  {
    emoji: "✦",
    title: "Calidad ante todo",
    desc: "Cada prenda pasa por un proceso de selección riguroso para garantizar materiales duraderos y acabados de nivel.",
  },
  {
    emoji: "♻",
    title: "Moda consciente",
    desc: "Trabajamos con proveedores comprometidos con procesos de producción responsables y sostenibles.",
  },
  {
    emoji: "❤",
    title: "Comunidad primero",
    desc: "Más que una tienda, somos un espacio donde el estilo se comparte. Tu opinión siempre nos importa.",
  },
  {
    emoji: "✈",
    title: "Envíos rápidos",
    desc: "Nos aseguramos de que tu pedido llegue en el menor tiempo posible, con seguimiento en tiempo real.",
  },
];

export default function SobreNosotrosPage() {
  return (
    <main className="space-y-14 py-10">
      {/* ── HERO ── */}
      <section>
        <Container className="px-4 max-w-3xl mx-auto text-center space-y-4">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Moda moderna con estilo propio
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto">
            LSB Shop nació de una idea simple: que la moda de calidad debería
            ser accesible para todos. Desde nuestros inicios curadamos cada
            pieza con cuidado, pensando en tu día a día.
          </p>
        </Container>
      </section>

      {/* ── VALORES ── */}
      <section>
        <Container className="px-4 max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold mb-10 text-center">
            Lo que nos define
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-14 gap-y-6">
            {VALUES.map(({ emoji, title, desc }) => (
              <div key={title} className="flex gap-4">
                <span className="text-2xl shrink-0">{emoji}</span>
                <div>
                  <h3 className="font-semibold mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ── MISIÓN ── */}
      <section>
        <Container className="px-4 max-w-3xl mx-auto text-center space-y-4">
          <h2 className="text-2xl font-semibold">Nuestra misión</h2>
          <p className="text-muted-foreground leading-relaxed">
            Conectar a las personas con ropa que les haga sentir bien, sin
            complicaciones. Exploramos tendencias, filtramos lo mejor y te lo
            traemos directamente. Así de sencillo.
          </p>
          <p className="text-sm text-muted-foreground">
            ¿Tienes alguna pregunta?{" "}
            <a
              href="/contacto"
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Escríbenos
            </a>
            .
          </p>
        </Container>
      </section>
    </main>
  );
}
