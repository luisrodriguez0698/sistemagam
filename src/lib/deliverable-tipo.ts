import type { DeliverableType } from "@prisma/client";

/**
 * Colores para distinguir Video de Diseño de un vistazo, compartidos entre
 * el Tablero (borde izquierdo de la tarjeta) y la Parrilla (ícono de tipo
 * junto al título) para que ambas vistas usen exactamente el mismo color.
 */
export const TIPO_ACCENT: Record<DeliverableType, { hex: string; badgeClassName: string }> = {
  // El cian al 10% de opacidad casi no se distingue sobre el fondo casi
  // negro del tema oscuro (a diferencia del magenta, que sí resalta a esa
  // misma opacidad) — por eso en modo oscuro sube a 25% para que ambos se
  // vean igual de visibles.
  VIDEO: {
    hex: "#06b6d4",
    badgeClassName: "bg-cyan-500/10 text-cyan-700 dark:bg-cyan-500/25 dark:text-cyan-300",
  },
  DISENO: {
    hex: "#d946ef",
    badgeClassName: "bg-fuchsia-500/10 text-fuchsia-700 dark:bg-fuchsia-500/25 dark:text-fuchsia-300",
  },
};
