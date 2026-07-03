"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { DeliverableCard } from "./deliverable-card";
import type { DeliverableCardData } from "./kanban-board";
import type { DeliverableStatus } from "@prisma/client";

interface KanbanColumnProps {
  id: DeliverableStatus;
  title: string;
  accentClassName: string;
  items: DeliverableCardData[];
  onCardClick: (deliverable: DeliverableCardData) => void;
  /** Tarjetas que no matchean los filtros activos se ocultan con CSS en vez
   *  de quitarse del arreglo, para no desalinear los índices que usa
   *  dnd-kit al calcular dónde soltar una tarjeta. */
  isVisible: (deliverable: DeliverableCardData) => boolean;
}

export function KanbanColumn({ id, title, accentClassName, items, onCardClick, isVisible }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const visibleCount = items.filter(isVisible).length;

  return (
    <div className="flex w-[82vw] shrink-0 snap-start flex-col rounded-2xl bg-muted/40 sm:w-72 md:w-80">
      <div className="flex items-center gap-2 px-3 pb-2 pt-3">
        <span className={cn("size-2 rounded-full", accentClassName)} />
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="ml-auto rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
          {visibleCount}
        </span>
      </div>

      <div
        ref={setNodeRef}
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
