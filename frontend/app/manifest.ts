import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LSB Shop",
    short_name: "LSB Shop",
    description:
      "Descubre moda moderna con estilo propio. Ropa de calidad, novedades constantes y los mejores precios.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/images/favicon-light.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/images/favicon-light.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
