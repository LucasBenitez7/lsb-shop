import { Container } from "@/components/ui";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y Condiciones | LSB Shop",
  description:
    "Lee nuestros términos y condiciones de uso, compra y devolución en LSB Shop.",
};

const SECTIONS = [
  {
    title: "1. Información general",
    content:
      "Al acceder y utilizar lsbshop.com aceptas estos términos y condiciones. Si no estás de acuerdo con alguna parte, te pedimos que no uses nuestra web. LSB Shop se reserva el derecho de actualizar estos términos en cualquier momento.",
  },
  {
    title: "2. Proceso de compra",
    content:
      "Al completar un pedido confirmas que la información proporcionada (nombre, dirección, datos de pago) es correcta y que eres mayor de edad. Recibirás una confirmación por correo electrónico tras realizar tu pedido. El contrato de compraventa se perfecciona en el momento en que enviamos dicha confirmación.",
  },
  {
    title: "3. Precios y pagos",
    content:
      "Todos los precios incluyen IVA y se muestran en euros. Nos reservamos el derecho de modificar precios en cualquier momento, aunque cualquier cambio no afectará a pedidos ya confirmados. Aceptamos pagos mediante tarjeta bancaria y otros métodos seguros habilitados en la tienda.",
  },
  {
    title: "4. Envíos y plazos de entrega",
    content:
      "Los plazos de entrega indicados son orientativos. LSB Shop no se hace responsable de retrasos causados por terceros (transportistas, aduanas, etc.). Puedes consultar el estado de tu pedido en cualquier momento desde la sección de seguimiento.",
  },
  {
    title: "5. Devoluciones y desistimiento",
    content:
      "Dispones de 14 días naturales desde la recepción del pedido para ejercer tu derecho de desistimiento sin necesidad de justificación. Los productos deben estar en su estado original, sin usar y con las etiquetas intactas. Para iniciar una devolución, accede a tu cuenta o contacta con nosotros.",
  },
  {
    title: "6. Productos defectuosos o incorrectos",
    content:
      "Si recibes un producto defectuoso o diferente al pedido, contáctanos en un plazo de 48 horas tras la recepción. Te enviaremos un artículo de reemplazo o realizaremos el reembolso completo, incluyendo gastos de envío.",
  },
  {
    title: "7. Propiedad intelectual",
    content:
      "Todos los contenidos de lsbshop.com (textos, imágenes, logotipos, diseño) son propiedad de LSB Shop o de sus licenciantes. Queda prohibida su reproducción, distribución o uso comercial sin autorización expresa.",
  },
  {
    title: "8. Limitación de responsabilidad",
    content:
      "LSB Shop no será responsable de daños indirectos, pérdida de beneficios o cualquier daño derivado del uso o imposibilidad de uso de nuestros productos o servicios más allá de lo establecido por la legislación vigente.",
  },
  {
    title: "9. Legislación aplicable",
    content:
      "Estos términos se rigen por la legislación española. Para cualquier controversia, las partes se someten a los juzgados y tribunales del domicilio del consumidor.",
  },
];

export default function TerminosPage() {
  return (
    <main>
      <Container className="py-12 px-4 max-w-3xl mx-auto">
        {/* Cabecera */}
        <div className="mb-10 space-y-2 border-b pb-6">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Legal
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Términos y Condiciones
          </h1>
          <p className="text-sm text-muted-foreground">
            Última actualización: febrero de 2025
          </p>
        </div>

        {/* Secciones */}
        <div className="space-y-8">
          {SECTIONS.map(({ title, content }) => (
            <section key={title}>
              <h2 className="font-semibold mb-2">{title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {content}
              </p>
            </section>
          ))}
        </div>

        {/* CTA contacto */}
        <div className="mt-10 pt-6 border-t text-sm text-muted-foreground">
          ¿Tienes alguna duda sobre estos términos?{" "}
          <a
            href="/contacto"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Contacta con nosotros
          </a>
        </div>
      </Container>
    </main>
  );
}
