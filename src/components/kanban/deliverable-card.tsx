"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { CalendarIcon, CopyPlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { hexToRgba, TIPO_ACCENT, TIPO_ICON, TIPO_LABEL } from "@/lib/deliverable-tipo";
import { formatDateOnly } from "@/lib/date-only";
import type { DeliverableCardData } from "./kanban-board";

interface DeliverableCardProps {
  deliverable: DeliverableCardData;
  onClick: () => void;
  /** Omitido en la vista fantasma del `DragOverlay` — ahí no aplica duplicar. */
  onDuplicate?: () => void;
}

// Resorte (no un ease lineal) para que el hover/tap se sienta "vivo" en vez
// de golpe seco — un poco de overshoot y desaceleración natural al soltar.
const HOVER_SPRING = { type: "spring" as const, stiffness: 350, damping: 24, mass: 0.6 };

export function DeliverableCard({ deliverable, onClick, onDuplicate }: DeliverableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deliverable.id,
  });
  const [isHovered, setIsHovered] = React.useState(false);

  // El posicionamiento de dnd-kit (transform/transition durante el drag)
  // vive en este div EXTERNO, sin estilos visuales — si se lo delegáramos
  // al mismo nodo que anima Framer Motion, ambas librerías pelearían por
  // controlar la propiedad `transform` del elemento. Framer Motion anima
  // el div INTERNO (fondo, sombra, hover/tap) en un nodo aparte, sin tocar
  // la posición.
  const dndStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const tipoAccent = TIPO_ACCENT[deliverable.tipo];
  const TipoIcon = TIPO_ICON[deliverable.tipo];
  const showGlow = isHovered && !isDragging;

  return (
    <div
      ref={setNodeRef}
      style={dndStyle}
      {...attributes}
      {...listeners}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        // Cursor "pointer" por defecto (la tarjeta es clicable — abre el
        // modal), y solo cambia a "grabbing" mientras el mouse está
        // presionado o dnd-kit confirma que el arrastre arrancó. Antes
        // mostraba la manita de arrastre todo el tiempo, lo cual sugería
        // que solo se podía arrastrar y escondía que también se puede
        // hacer click.
        "group relative cursor-pointer active:cursor-grabbing",
        isDragging && "cursor-grabbing opacity-50"
      )}
    >
      {/* Aura de color del tipo (Video, Diseño, etc.), detrás de la
          tarjeta — respira suave con un pulso mientras haces hover; el
          `-z-10` la mantiene siempre por debajo del contenido, nunca
          tapándolo. Solo anima mientras `showGlow` es true, para no tener
          docenas de loops de animación corriendo en tarjetas que nadie
          está mirando. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -inset-1.5 -z-10 rounded-2xl blur-lg"
        style={{ backgroundColor: tipoAccent.hex }}
        initial={false}
        animate={
          showGlow
            ? { opacity: 0.22, scale: [1, 1.05, 1] }
            : { opacity: 0, scale: 1 }
        }
        transition={
          showGlow
            ? { opacity: { duration: 0.25 }, scale: { duration: 2.4, repeat: Infinity, ease: "easeInOut" } }
            : { duration: 0.25 }
        }
      />

      <motion.div
        whileHover={isDragging ? undefined : { y: -6, scale: 1.015 }}
        whileTap={{ scale: 0.985 }}
        transition={HOVER_SPRING}
        style={{
          borderLeftColor: tipoAccent.hex,
          boxShadow: showGlow ? `0 14px 28px -16px ${hexToRgba(tipoAccent.hex, 0.32)}` : undefined,
        }}
        className="space-y-2 rounded-xl border border-l-4 bg-card p-3 text-card-foreground shadow-sm transition-shadow duration-200"
      >
        {onDuplicate && (
          <button
            type="button"
            // Corta la propagación en pointerdown (no solo en click): los
            // `{...listeners}` de dnd-kit escuchan pointerdown en el div
            // externo para arrancar el arrastre — sin esto, tocar este
            // botón también intentaría iniciar un drag.
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="absolute right-2 top-2 z-10 flex size-6 items-center justify-center rounded-full bg-background/90 text-muted-foreground opacity-0 shadow-sm transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
            aria-label="Duplicar entregable"
            title="Duplicar"
          >
            <CopyPlusIcon className="size-3.5" />
          </button>
        )}

        {deliverable.archivoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- imagen externa (R2)
          <img
            src={deliverable.archivoUrl}
            alt=""
            className="h-20 w-full rounded-md object-cover"
            draggable={false}
          />
        )}

        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              tipoAccent.badgeClassName
            )}
          >
            <TipoIcon className="size-3" />
            {TIPO_LABEL[deliverable.tipo]}
          </span>
          {deliverable.esExtra && (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              Extra
            </span>
          )}
        </div>

        <p className="text-sm font-medium leading-snug">{deliverable.titulo}</p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: deliverable.clienteColor }}
            aria-hidden
          />
          {deliverable.clienteNombre}
        </p>

        {deliverable.fechaEntrega && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarIcon className="size-3" />
            {formatDateOnly(deliverable.fechaEntrega)}
          </div>
        )}

        {deliverable.esExtra && deliverable.montoExtra != null && (
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">
              {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
                deliverable.montoExtra
              )}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-medium",
                deliverable.estatusPagoExtra === "PAGADO"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              )}
            >
              {deliverable.estatusPagoExtra === "PAGADO" ? "Pagado" : "Pendiente"}
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
