"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { DeliverableCard } from "./deliverable-card";
import type { DeliverableCardData } from "./kanban-board";
import { columnDragId } from "./column-drag-id";

interface KanbanColumnProps {
  id: string;
  title: string;
  /** Color elegido para este estatus (hex libre, no una paleta fija de Tailwind). */
  color: string;
  items: DeliverableCardData[];
  onCardClick: (deliverable: DeliverableCardData) => void;
  /** Tarjetas que no matchean los filtros activos se ocultan con CSS en vez
   *  de quitarse del arreglo, para no desalinear los índices que usa
   *  dnd-kit al calcular dónde soltar una tarjeta. */
  isVisible: (deliverable: DeliverableCardData) => boolean;
}

export function KanbanColumn({ id, title, color, items, onCardClick, isVisible }: KanbanColumnProps) {
  // La columna en sí es "sortable" (para reordenarla arrastrando el
  // encabezado) con un id prefijado (`columnDragId`) DISTINTO al id que usa
  // el droppable de tarjetas de abajo — si compartieran el mismo id, dnd-kit
  // registraría dos zonas con el mismo id en el mismo DndContext y la
  // detección de colisiones se vuelve ambigua entre "soltar tarjeta aquí" y
  // "reordenar columna aquí".
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: columnDragId(id), data: { type: "column" } });
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id });
  const visibleCount = items.filter(isVisible).length;

  return (
    <div
      ref={setSortableRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex w-[82vw] shrink-0 snap-start flex-col rounded-2xl bg-muted/40 sm:w-72 md:w-80",
        isDragging && "opacity-50"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex cursor-grab items-center gap-2 px-3 pb-2 pt-3 active:cursor-grabbing"
      >
        <span className="size-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="ml-auto rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
          {visibleCount}
        </span>
      </div>

      <div
        ref={setDroppableRef}
        className={cn(
          "flex min-h-24 flex-1 flex-col gap-2 rounded-xl p-2 transition-colors",
          isOver && "bg-primary/5 ring-2 ring-primary/30"
        )}
      >
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((deliverable) => (
            <div key={deliverable.id} className={cn(!isVisible(deliverable) && "hidden")}>
              <DeliverableCard deliverable={deliverable} onClick={() => onCardClick(deliverable)} />
            </div>
          ))}
        </SortableContext>
        {visibleCount === 0 && (
          <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
            Sin entregables
          </div>
        )}
      </div>
    </div>
  );
}
