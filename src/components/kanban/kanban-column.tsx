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
}

export function KanbanColumn({ id, title, accentClassName, items, onCardClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-2xl bg-muted/40 sm:w-80">
      <div className="flex items-center gap-2 px-3 pb-2 pt-3">
        <span className={cn("size-2 rounded-full", accentClassName)} />
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="ml-auto rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
          {items.length}
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
            <DeliverableCard
              key={deliverable.id}
              deliverable={deliverable}
              onClick={() => onCardClick(deliverable)}
            />
          ))}
        </SortableContext>
        {items.length === 0 && (
          <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
            Sin entregables
          </div>
        )}
      </div>
    </div>
  );
}
