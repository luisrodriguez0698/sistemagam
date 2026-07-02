/** @type {import('next').NextConfig} */
const nextConfig = {
  // @react-pdf/renderer publica un build distinto para navegador vs. Node
  // (campo "browser" en su package.json). El Route Handler que genera el
  // PDF corre en Node, pero el bundler intentaba resolver el build de
  // navegador de todas formas, causando errores de React al mezclar dos
  // configuraciones internas distintas del renderer. `serverExternalPackages`
  // le dice a Next que NO empaquete este paquete y deje que Node lo
  // resuelva de forma nativa en tiempo de ejecución.
  serverExternalPackages: ["@react-pdf/renderer"],
  // Los Server Actions limitan el body a 1MB por defecto. La imagen ya se
  // comprime en el navegador antes de subirla (ver deliverable-image-upload),
  // así que en la práctica nunca debería acercarse a este límite; se sube
  // de todas formas como red de seguridad (ej. capturas de pantalla muy
  // grandes antes de comprimir, formatos que el canvas no logra reducir).
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
