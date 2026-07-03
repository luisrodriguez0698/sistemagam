import { GlobeIcon, ImageIcon, LayoutTemplateIcon, MailIcon, PenToolIcon, TagIcon, VideoIcon } from "lucide-react";
import type { DeliverableType } from "@prisma/client";

/**
 * Fuente única de verdad para nombre/ícono/color de cada tipo de
 * entregable, compartida entre Tablero, Parrilla, Calendario y los PDFs
 * exportables. Solo VIDEO y DISENO participan de la cuota mensual
 * recurrente — el resto son proyectos únicos (siempre `esExtra`).
 */
export const TIPO_LABEL: Record<DeliverableType, string> = {
  VIDEO: "Video",
  DISENO: "Diseño",
  LOGO: "Logo",
  SITIO_WEB: "Sitio web",
  INVITACION_DIGITAL: "Invitación digital",
  LANDING_PAGE: "Landing page",
  OTRO: "Otro",
};

export const TIPO_ICON: Record<DeliverableType, typeof VideoIcon> = {
  VIDEO: VideoIcon,
  DISENO: ImageIcon,
  LOGO: PenToolIcon,
  SITIO_WEB: GlobeIcon,
  INVITACION_DIGITAL: MailIcon,
  LANDING_PAGE: LayoutTemplateIcon,
  OTRO: TagIcon,
};

// El cian/magenta al 10% de opacidad casi no se distinguen sobre el fondo
// casi negro del tema oscuro (a diferencia de otros matices que sí
// resaltan a esa misma opacidad) — por eso en modo oscuro sube a 25% para
// que todos los tipos se vean igual de visibles.
export const TIPO_ACCENT: Record<DeliverableType, { hex: string; badgeClassName: string }> = {
  VIDEO: {
    hex: "#06b6d4",
    badgeClassName: "bg-cyan-500/10 text-cyan-700 dark:bg-cyan-500/25 dark:text-cyan-300",
  },
  DISENO: {
    hex: "#d946ef",
    badgeClassName: "bg-fuchsia-500/10 text-fuchsia-700 dark:bg-fuchsia-500/25 dark:text-fuchsia-300",
  },
  LOGO: {
    hex: "#f97316",
    badgeClassName: "bg-orange-500/10 text-orange-700 dark:bg-orange-500/25 dark:text-orange-300",
  },
  SITIO_WEB: {
    hex: "#6366f1",
    badgeClassName: "bg-indigo-500/10 text-indigo-700 dark:bg-indigo-500/25 dark:text-indigo-300",
  },
  INVITACION_DIGITAL: {
    hex: "#f43f5e",
    badgeClassName: "bg-rose-500/10 text-rose-700 dark:bg-rose-500/25 dark:text-rose-300",
  },
  LANDING_PAGE: {
    hex: "#14b8a6",
    badgeClassName: "bg-teal-500/10 text-teal-700 dark:bg-teal-500/25 dark:text-teal-300",
  },
  OTRO: {
    hex: "#64748b",
    badgeClassName: "bg-slate-500/10 text-slate-700 dark:bg-slate-500/25 dark:text-slate-300",
  },
};

// Encabezados de sección para los PDF de Parrilla/Resumen — Diseño/Video
// conservan exactamente el texto que ya tenían (plural) para no cambiar el
// PDF que ya le mandas a tus clientes; los tipos nuevos usan su nombre tal
// cual.
export const TIPO_SECTION_LABEL: Record<DeliverableType, string> = {
  ...TIPO_LABEL,
  DISENO: "Diseños",
  VIDEO: "Videos / Reels",
};

/** Solo VIDEO/DISENO pueden ser parte de la cuota mensual recurrente. */
export function isRecurringTipo(tipo: DeliverableType): boolean {
  return tipo === "VIDEO" || tipo === "DISENO";
}

// Orden fijo para listar/exportar tipos de forma consistente: primero los
// dos recurrentes (Diseño, Video), luego los proyectos únicos.
export const TIPO_ORDER: DeliverableType[] = [
  "DISENO",
  "VIDEO",
  "LOGO",
  "SITIO_WEB",
  "INVITACION_DIGITAL",
  "LANDING_PAGE",
  "OTRO",
];
