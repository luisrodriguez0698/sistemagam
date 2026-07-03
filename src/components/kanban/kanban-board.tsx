"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { KanbanColumn } from "./kanban-column";
import { DeliverableCard } from "./deliverable-card";
import { DeliverableDrawer } from "./deliverable-drawer";
import { KanbanFilters } from "./kanban-filters";
import { moveDeliverable } from "@/actions/deliverables";
import type { DeliverableStatus, DeliverableType, ExtraPaymentStatus } from "@prisma/client";

export type DeliverableCardData = {
  id: string;
  titulo: string;
  descripcion?: string | null;
  tipo: DeliverableType;
  estado: DeliverableStatus;
  fechaEntrega?: string | null; // ISO string, serializado desde el Server Component
  clientId: string;
  clienteNombre: string;
  clienteColor: string;
  linkEjemplo?: string | null;
  archivoUrl?: string | null;
  copy?: string | null;
  orden: number;
  esExtra: boolean;
  montoExtra?: number | null;
  estatusPagoExtra?: ExtraPaymentStatus | null;
  // Si ya existe un INGRESO en Finanzas ligado a este entregable extra; se
  // usa para no pedir cuenta bancaria / no duplicar la transacción cuando
  // ya se registró previamente.
  hasPaymentTransaction: boolean;
  updatedAt: string; // ISO string; usado para invalidar el estado interno del tablero al editar desde la parrilla
};

export interface BankAccountOption {
  id: string;
  nombreBanco: string;
}

const COLUMNS: { id: DeliverableStatus; title: string; accentClassName: string }[] = [
  { id: "EN_PROCESO", title: "En proceso", accentClassName: "bg-blue-500" },
  { id: "REVISION_CLIENTE", title: "Revisión del cliente", accentClassName: "bg-amber-500" },
  { id: "APROBADO", title: "Aprobado", accentClassName: "bg-emerald-500" },
  { id: "PUBLICADO", title: "Publicado", accentClassName: "bg-violet-500" },
];

interface KanbanBoardProps {
  initialDeliverables: DeliverableCardData[];
  bankAccounts: BankAccountOption[];
}

// `closestCorners` compara distancias entre esquinas de TODOS los
// droppables (columnas + tarjetas de otras columnas), y una columna vacía
// puede perder esa comparación contra tarjetas lejanas, así que nunca
// queda como "over" y el drop no hace nada. `pointerWithin` en cambio
// pregunta directamente "¿el cursor está dentro de este rectángulo?", que
// sí detecta columnas vacías de forma confiable. Se usa como estrategia
// principal y `rectIntersection` como respaldo si el cursor no cae dentro
// de ningún droppable (ej. arrastre muy rápido).
const collisionDetectionStrategy: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  return pointerCollisions.length > 0 ? pointerCollisions : rectIntersection(args);
};

type SortMode = "MANUAL" | "NOMBRE" | "TIPO";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "MANUAL", label: "Manual" },
  { value: "NOMBRE", label: "Nombre" },
  { value: "TIPO", label: "Tipo" },
];

// Ordena cada columna de forma independiente (nunca mezcla tarjetas entre
// estatus distintos, cada arreglo ya viene separado por columna). En modo
// "MANUAL" respeta el orden de arrastre (`orden`); los otros dos son un
// orden de SOLO VISTA que se recalcula en cada render.
function sortItems(items: DeliverableCardData[], mode: SortMode): DeliverableCardData[] {
  if (mode === "MANUAL") return items;
  const sorted = [...items];
  if (mode === "NOMBRE") {
    sorted.sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));
  } else {
    sorted.sort((a, b) => {
      if (a.tipo !== b.tipo) return a.tipo === "VIDEO" ? -1 : 1;
      return a.titulo.localeCompare(b.titulo, "es");
    });
  }
  return sorted;
}

export function KanbanBoard({ initialDeliverables, bankAccounts }: KanbanBoardProps) {
  const [columns, setColumns] = React.useState<Record<DeliverableStatus, DeliverableCardData[]>>(
    () => groupByStatus(initialDeliverables)
  );
  const [activeCard, setActiveCard] = React.useState<DeliverableCardData | null>(null);
  const [selectedCard, setSelectedCard] = React.useState<DeliverableCardData | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [tipoFilter, setTipoFilter] = React.useState<DeliverableType | "ALL">("ALL");
  const [sortMode, setSortMode] = React.useState<SortMode>("MANUAL");

  const clientOptions = React.useMemo(() => {
    const seen = new Map<string, { id: string; nombreNegocio: string; colorHex: string }>();
    for (const d of initialDeliverables) {
      if (!seen.has(d.clientId)) {
        seen.set(d.clientId, { id: d.clientId, nombreNegocio: d.clienteNombre, colorHex: d.clienteColor });
      }
    }
    return [...seen.values()].sort((a, b) => a.nombreNegocio.localeCompare(b.nombreNegocio));
  }, [initialDeliverables]);

  const [selectedClientIds, setSelectedClientIds] = React.useState<Set<string>>(
    () => new Set(clientOptions.map((c) => c.id))
  );

  function toggleClient(clientId: string) {
    setSelectedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  }

  function isCardVisible(deliverable: DeliverableCardData) {
    return (
      selectedClientIds.has(deliverable.clientId) &&
      (tipoFilter === "ALL" || deliverable.tipo === tipoFilter)
    );
  }

  // Sensores separados por tipo de entrada: con mouse, 6px de movimiento ya
  // activa el arrastre (es preciso, no hay ambigüedad con hacer scroll).
  // Con el dedo, un swipe rápido para deslizar entre columnas también mueve
  // más de 6px desde el primer instante, así que se confundía con querer
  // arrastrar la tarjeta. TouchSensor en cambio exige mantener presionado
  // ~250ms antes de arrancar el arrastre — un swipe normal dura menos que
  // eso y nunca lo activa, dejando el scroll libre; `tolerance` permite que
  // el dedo tiemble un poco durante esa espera sin cancelarla.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } })
  );

  function findColumnOf(id: string): DeliverableStatus | undefined {
    return (Object.keys(columns) as DeliverableStatus[]).find((status) =>
      columns[status].some((item) => item.id === id)
    );
  }

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    const status = findColumnOf(id);
    if (!status) return;
    setActiveCard(columns[status].find((c) => c.id === id) ?? null);
  }

  // Todo el cálculo de cruce/reordenamiento de columnas vive en
  // handleDragEnd (una sola vez, al soltar). Intentarlo en onDragOver
  // (reinsertando la tarjeta en cada evento de hover) causaba un ciclo:
  // insertarla movía el layout debajo del cursor, dnd-kit detectaba un
  // "over" distinto en el siguiente frame y la regresaba, entrando en un
  // loop de setState que termina en "Maximum update depth exceeded".
  function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const fromStatus = findColumnOf(activeId);
    if (!fromStatus) return;

    const toStatus = (COLUMNS.find((c) => c.id === overId)?.id ?? findColumnOf(overId)) as
      | DeliverableStatus
      | undefined;
    if (!toStatus) return;

    const sourceItems = columns[fromStatus];
    const card = sourceItems.find((c) => c.id === activeId);
    if (!card) return;

    // Con un orden automático (Nombre/Tipo) activo, reacomodar dentro de la
    // MISMA columna no tendría efecto visible — se resuelve solo al volver
    // a ordenar en el próximo render — así que ese caso se ignora. Mover
    // entre columnas (cambiar de estatus) sigue funcionando siempre.
    if (fromStatus === toStatus && sortMode !== "MANUAL") return;

    let reorderedTarget: DeliverableCardData[];

    if (fromStatus === toStatus) {
      const oldIndex = sourceItems.findIndex((c) => c.id === activeId);
      const newIndex = sourceItems.findIndex((c) => c.id === overId);
      reorderedTarget = newIndex !== -1 ? arrayMove(sourceItems, oldIndex, newIndex) : sourceItems;

      setColumns((prev) => ({ ...prev, [fromStatus]: reorderedTarget }));
    } else {
      const targetItems = columns[toStatus];
      const overIndexInTarget = targetItems.findIndex((c) => c.id === overId);
      const insertIndex = overIndexInTarget === -1 ? targetItems.length : overIndexInTarget;

      reorderedTarget = [
        ...targetItems.slice(0, insertIndex),
        { ...card, estado: toStatus },
        ...targetItems.slice(insertIndex),
      ];

      setColumns((prev) => ({
        ...prev,
        [fromStatus]: sourceItems.filter((c) => c.id !== activeId),
        [toStatus]: reorderedTarget,
      }));
    }

    // Server Action optimista: no bloqueamos la UI a la espera de la
    // respuesta; si falla, un manejo de error global (toast) puede
    // revertir el estado — omitido aquí por brevedad.
    void moveDeliverable({
      deliverableId: activeId,
      estado: toStatus,
      orderedIdsInTargetColumn: reorderedTarget.map((c) => c.id),
    });
  }

  function handleCardClick(deliverable: DeliverableCardData) {
    setSelectedCard(deliverable);
    setDrawerOpen(true);
  }

  function handleSaved(updated: DeliverableCardData) {
    setColumns((prev) => ({
      ...prev,
      [updated.estado]: prev[updated.estado].map((c) => (c.id === updated.id ? updated : c)),
    }));
    // El Drawer sigue leyendo `selectedCard` (no la lista `columns`) mientras
    // está abierto — sin esto, subir una imagen no se vería reflejada ahí
    // hasta cerrar y volver a abrir el Drawer.
    setSelectedCard((prev) => (prev && prev.id === updated.id ? updated : prev));
  }

  function handleDeleted(deliverableId: string) {
    setColumns((prev) => {
      const next = { ...prev };
      for (const status of Object.keys(next) as DeliverableStatus[]) {
        next[status] = next[status].filter((c) => c.id !== deliverableId);
      }
      return next;
    });
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <KanbanFilters
          clients={clientOptions}
          selectedClientIds={selectedClientIds}
          onToggleClient={toggleClient}
          onSelectAllClients={() => setSelectedClientIds(new Set(clientOptions.map((c) => c.id)))}
          onSelectNoClients={() => setSelectedClientIds(new Set())}
          tipoFilter={tipoFilter}
          onTipoFilterChange={setTipoFilter}
        />

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Ordenar:</span>
          <div className="flex rounded-lg border p-0.5">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSortMode(opt.value)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  sortMode === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <DndContext
        id="kanban-entregables"
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4">
          {/* En móvil cada columna ocupa ~82vw (una a la vista, con peek de
              la siguiente) para que el swipe horizontal se sienta como un
              carrusel; en sm+ vuelve al ancho fijo original de varias
              columnas visibles a la vez. */}
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              accentClassName={column.accentClassName}
              items={sortItems(columns[column.id], sortMode)}
              onCardClick={handleCardClick}
              isVisible={isCardVisible}
            />
          ))}
        </div>

        <DragOverlay>
          {activeCard ? <DeliverableCard deliverable={activeCard} onClick={() => {}} /> : null}
        </DragOverlay>
      </DndContext>

      <DeliverableDrawer
        deliverable={selectedCard}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
        bankAccounts={bankAccounts}
      />
    </>
  );
}

function groupByStatus(deliverables: DeliverableCardData[]) {
  const base: Record<DeliverableStatus, DeliverableCardData[]> = {
    EN_PROCESO: [],
    REVISION_CLIENTE: [],
    APROBADO: [],
    PUBLICADO: [],
  };
  for (const d of deliverables) base[d.estado].push(d);
  for (const status of Object.keys(base) as DeliverableStatus[]) {
    base[status].sort((a, b) => a.orden - b.orden);
  }
  return base;
}
