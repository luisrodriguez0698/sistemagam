"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarIcon, ImageIcon, VideoIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TIPO_ACCENT } from "@/lib/deliverable-tipo";
import type { DeliverableCardData } from "./kanban-board";

interface DeliverableCardProps {
  deliverable: DeliverableCardData;
  onClick: () => void;
}

export function DeliverableCard({ deliverable, onClick }: DeliverableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deliverable.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const tipoAccent = TIPO_ACCENT[deliverable.tipo];

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, borderLeftColor: tipoAccent.hex }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "cursor-grab space-y-2 rounded-xl border border-l-4 bg-card p-3 text-card-foreground shadow-sm transition-shadow active:cursor-grabbing",
        "hover:shadow-md",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
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
          {deliverable.tipo === "VIDEO" ? (
            <VideoIcon className="size-3" />
          ) : (
            <ImageIcon className="size-3" />
          )}
          {deliverable.tipo === "VIDEO" ? "Video" : "Diseño"}
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
          {new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short" }).format(
            new Date(deliverable.fechaEntrega)
          )}
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
    </div>
  );
}
