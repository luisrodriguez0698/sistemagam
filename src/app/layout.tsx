import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/session-provider";
import { ConfirmProvider } from "@/components/confirm-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestión de Agencias",
  description: "Plataforma multitenant para agencias de marketing digital",
};

// Sin esto, los navegadores móviles renderizan la página a un ancho de
// escritorio (~980px) y la reducen para que quepa en pantalla — todo se ve
// diminuto y "sin responsive" aunque el CSS ya use breakpoints correctos.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <SessionProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <ConfirmProvider>{children}</ConfirmProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
