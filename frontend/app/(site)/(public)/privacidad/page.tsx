import { Container } from "@/components/ui";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad y Cookies | LSB Shop",
  description:
    "Consulta nuestra política de privacidad y cookies. Cómo recogemos, usamos y protegemos tus datos personales.",
};

const SECTIONS = [
  {
    title: "1. Responsable del tratamiento",
    content:
      "LSB Shop es el responsable del tratamiento de los datos personales que nos proporciones al navegar por nuestra web, registrarte como usuario o realizar una compra. Puedes contactarnos en hola@lsbshop.com.",
  },
  {
    title: "2. Datos que recogemos",
    content:
      "Recogemos los datos que nos facilitas directamente (nombre, correo electrónico, dirección de envío, etc.) y datos de navegación obtenidos a través de cookies y tecnologías similares. Nunca vendemos tus datos a terceros.",
  },
  {
    title: "3. Finalidad del tratamiento",
    content:
      "Usamos tus datos para gestionar tu cuenta y pedidos, procesar pagos, enviarte comunicaciones transaccionales (confirmaciones, rastreo) y mejorar nuestra tienda. Solo te enviaremos comunicaciones de marketing si nos has dado tu consentimiento explícito.",
  },
  {
    title: "4. Base legal",
    content:
      "El tratamiento se basa en la ejecución del contrato de compraventa (pedidos), el cumplimiento de obligaciones legales (facturación) y, en su caso, tu consentimiento (newsletters, cookies no esenciales).",
  },
  {
    title: "5. Conservación de datos",
    content:
      "Conservamos tus datos mientras mantengas una relación contractual con nosotros y durante el período exigido por la legislación aplicable (hasta 5 años para datos fiscales).",
  },
  {
    title: "6. Tus derechos",
    content:
      "Tienes derecho a acceder, rectificar, suprimir, limitar el tratamiento y oponerte al uso de tus datos. También puedes solicitar la portabilidad de tus datos. Para ejercer cualquiera de estos derechos, escríbenos a hola@lsbshop.com.",
  },
  {
    title: "7. Política de Cookies",
    content:
      "Usamos cookies técnicas (necesarias para el funcionamiento de la web) y cookies analíticas (para entender cómo navegas y mejorar la experiencia). Puedes gestionar o rechazar las cookies no esenciales en cualquier momento desde la configuración de tu navegador.",
  },
  {
    title: "8. Cambios en esta política",
    content:
      "Podemos actualizar esta política en cualquier momento. Te notificaremos de cambios significativos por correo electrónico o mediante un aviso destacado en la web.",
  },
];

export default function PrivacidadPage() {
  return (
    <main>
      <Container className="py-12 px-4 max-w-3xl mx-auto">
        {/* Cabecera */}
        <div className="mb-10 space-y-2 border-b pb-6">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Legal
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Política de Privacidad y Cookies
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
          ¿Tienes alguna pregunta?{" "}
          <a
            href="/contacto"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Contacta con nosotros
          </a>
          .
        </div>
      </Container>
    </main>
  );
}
