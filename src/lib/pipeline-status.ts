import type React from "react";

// Columna/estatus del Kanban — ya no es un enum fijo, cada agencia define
// las suyas (ver PipelineStatus en el schema). `esDefault` protege a las 4
// originales de borrarse; `esFinal` marca cuáles cuentan como "completado"
// en las estadísticas del resumen.
export interface PipelineStatusOption {
  id: string;
  nombre: string;
  color: string;
  orden: number;
  esDefault: boolean;
  esFinal: boolean;
}

// El color es libre (elegido por el usuario), no una paleta fija de
// Tailwind, así que el badge se pinta con estilo inline en vez de clases
// `bg-*-500/10` — mismo criterio visual (fondo suave, texto sólido) que
// usan los demás badges de color libre en el sistema (colorHex de cliente).
export function statusBadgeStyle(hex: string): React.CSSProperties {
  return { backgroundColor: `${hex}1a`, color: hex };
}

export function findStatus(statuses: PipelineStatusOption[], statusId: string): PipelineStatusOption | undefined {
  return statuses.find((s) => s.id === statusId);
}

// Paleta compartida entre el drawer de "Gestionar estatus" y el botón
// rápido de "Agregar columna" del Tablero — mismos colores en los dos
// lugares donde se puede crear/editar un estatus.
export const COLOR_PALETTE = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
  "#f43f5e",
];

// Las 4 columnas con las que arranca toda agencia nueva — el usuario puede
// agregar más encima, pero estas siempre existen (se pueden renombrar y
// recolorear, no borrar). Mismos valores que se usaron para el backfill de
// agencias que ya existían antes de este catálogo dinámico.
export const DEFAULT_PIPELINE_STATUSES = [
  { nombre: "En proceso", color: "#3b82f6", orden: 0, esFinal: false },
  { nombre: "Revisión del cliente", color: "#f59e0b", orden: 1, esFinal: false },
  { nombre: "Aprobado", color: "#10b981", orden: 2, esFinal: true },
  { nombre: "Publicado", color: "#8b5cf6", orden: 3, esFinal: true },
] as const;
