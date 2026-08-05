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
import { arrayMove, horizontalListSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { KanbanColumn } from "./kanban-column";
import { AddColumnButton } from "./add-column-button";
import { DeliverableCard } from "./deliverable-card";
import { DeliverableDrawer } from "./deliverable-drawer";
import { KanbanFilters } from "./kanban-filters";
import { columnDragId, isColumnDragId, statusIdFromColumnDragId } from "./column-drag-id";
import { moveDeliverable } from "@/actions/deliverables";
import { reorderPipelineStatuses } from "@/actions/pipeline-statuses";
import type { ClientFilterOption } from "./kanban-filters";
import type { PipelineStatusOption } from "@/lib/pipeline-status";
import type { DeliverableType, ExtraPaymentStatus } from "@prisma/client";

export type DeliverableCardData = {
  id: string;
  titulo: string;
  descripcion?: string | null;
  tipo: DeliverableType;
  statusId: string;
  fechaEntrega?: string | null; // ISO string, serializado desde el Server Component
  clientId: string;
  clienteNombre: string;
  clienteColor: string;
  linkEjemplo?: string | null;
  archivoUrl?: string | null;
  copy?: string | null;
  guion?: string | null;
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

interface KanbanBoardProps {
  initialDeliverables: DeliverableCardData[];
  bankAccounts: BankAccountOption[];
  // Columnas del Tablero — configurables por agencia (ver PipelineStatus),
  // ya no son un enum fijo de 4 valores.
  statuses: PipelineStatusOption[];
  // Filtros/orden viven en el padre (EntregablesView) para sobrevivir el
  // resync de datos frescos del servidor (ver useEffect más abajo) — antes
  // vivían aquí adentro y un simple arrastre de tarjeta (que revalida datos
  // del servidor) los reseteaba sin que el usuario lo pidiera.
  clientOptions: ClientFilterOption[];
  selectedClientIds: Set<string>;
  onToggleClient: (clientId: string) => void;
  onSelectAllClients: () => void;
  onSelectNoClients: () => void;
  tipoFilter: DeliverableType | "ALL";
  onTipoFilterChange: (tipo: DeliverableType | "ALL") => void;
  sortMode: SortMode;
  onSortModeChange: (mode: SortMode) => void;
}

// `closestCorners` compara distancias entre esquinas de TODOS los
// droppables (columnas + tarjetas de otras columnas), y una columna vacía
// puede perder esa comparación contra tarjetas lejanas, así que nunca
// queda como "over" y el drop no hace nada. `pointerWithin` en cambio
// pregunta directamente "¿el cursor está dentro de este rectángulo?", que
// sí detecta columnas vacías de forma confiable. Se usa como estrategia
// principal y `rectIntersection` como respaldo si el cursor no cae dentro
// de ningún droppable (ej. arrastre muy rápido).
//
// Se filtran los droppables por "tipo" antes de correr esa estrategia:
// arrastrar una TARJETA nunca debe poder resolver como "over" la zona
// sortable de una COLUMNA (id con prefijo `column:`) y viceversa — sin este
// filtro, un arrastre de columna que pasa por encima del área de tarjetas de
// otra columna (que están anidadas adentro, mismo rectángulo en pantalla)
// podía resolver el "over" contra una tarjeta suelta en vez de la columna.
const collisionDetectionStrategy: CollisionDetection = (args) => {
  const draggingColumn = isColumnDragId(String(args.active.id));
  const droppableContainers = args.droppableContainers.filter((container) =>
    isColumnDragId(String(container.id)) === draggingColumn
  );
  const filteredArgs = { ...args, droppableContainers };
  const pointerCollisions = pointerWithin(filteredArgs);
  return pointerCollisions.length > 0 ? pointerCollisions : rectIntersection(filteredArgs);
};

export type SortMode = "MANUAL" | "NOMBRE" | "TIPO";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "MANUAL", label: "Manual" },
  { value: "NOMBRE", label: "Nombre" },
  { value: "TIPO", label: "Tipo" },
];

// Orden de "Tipo": Video y Diseño primero (como siempre), luego el resto de
// tipos en un orden fijo — para que el ordenamiento no salte de posición
// entre renders.
const TIPO_SORT_ORDER: DeliverableType[] = [
  "VIDEO",
  "DISENO",
  "LOGO",
  "SITIO_WEB",
  "INVITACION_DIGITAL",
  "LANDING_PAGE",
  "OTRO",
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
      const tipoDiff = TIPO_SORT_ORDER.indexOf(a.tipo) - TIPO_SORT_ORDER.indexOf(b.tipo);
      return tipoDiff !== 0 ? tipoDiff : a.titulo.localeCompare(b.titulo, "es");
    });
  }
  return sorted;
}

export function KanbanBoard({
  initialDeliverables,
  bankAccounts,
  statuses,
  clientOptions,
  selectedClientIds,
  onToggleClient,
  onSelectAllClients,
  onSelectNoClients,
  tipoFilter,
  onTipoFilterChange,
  sortMode,
  onSortModeChange,
}: KanbanBoardProps) {
  const [columns, setColumns] = React.useState<Record<string, DeliverableCardData[]>>(
    () => groupByStatus(initialDeliverables, statuses)
  );
  const [orderedStatuses, setOrderedStatuses] = React.useState<PipelineStatusOption[]>(statuses);
  const [activeCard, setActiveCard] = React.useState<DeliverableCardData | null>(null);
  const [activeStatusId, setActiveStatusId] = React.useState<string | null>(null);
  const [selectedCard, setSelectedCard] = React.useState<DeliverableCardData | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Re-sincroniza las columnas cuando llegan datos frescos del servidor
  // (ej. tras un `revalidatePath` tras arrastrar una tarjeta o editar desde
  // la Parrilla), SIN remontar el componente — así el resto del estado del
  // Tablero (filtros, orden, qué tarjeta tienes seleccionada) no se pierde.
  React.useEffect(() => {
    setColumns(groupByStatus(initialDeliverables, statuses));
  }, [initialDeliverables, statuses]);

  // Mismo criterio que arriba, pero para el ORDEN de las columnas: se
  // reordenan localmente al soltar (optimista) y luego se resincroniza con
  // lo que confirme el servidor (ej. si otra persona reordenó al mismo
  // tiempo, o al agregar una columna nueva desde "Agregar columna").
  React.useEffect(() => {
    setOrderedStatuses(statuses);
  }, [statuses]);

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

  function findColumnOf(id: string): string | undefined {
    return Object.keys(columns).find((status) => columns[status].some((item) => item.id === id));
  }

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);

    if (isColumnDragId(id)) {
      setActiveStatusId(statusIdFromColumnDragId(id));
      return;
    }

    const status = findColumnOf(id);
    if (!status) return;
    setActiveCard(columns[status].find((c) => c.id === id) ?? null);
  }

  function handleColumnDragEnd(activeId: string, overId: string) {
    if (!isColumnDragId(overId)) return;

    const fromStatusId = statusIdFromColumnDragId(activeId);
    const toStatusId = statusIdFromColumnDragId(overId);
    if (fromStatusId === toStatusId) return;

    const oldIndex = orderedStatuses.findIndex((s) => s.id === fromStatusId);
    const newIndex = orderedStatuses.findIndex((s) => s.id === toStatusId);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(orderedStatuses, oldIndex, newIndex);
    setOrderedStatuses(reordered);

    // Server Action optimista, igual que al mover una tarjeta: no se espera
    // la respuesta para reflejar el nuevo orden en pantalla.
    void reorderPipelineStatuses({ orderedIds: reordered.map((s) => s.id) });
  }

  // Todo el cálculo de cruce/reordenamiento de columnas vive en
  // handleDragEnd (una sola vez, al soltar). Intentarlo en onDragOver
  // (reinsertando la tarjeta en cada evento de hover) causaba un ciclo:
  // insertarla movía el layout debajo del cursor, dnd-kit detectaba un
  // "over" distinto en el siguiente frame y la regresaba, entrando en un
  // loop de setState que termina en "Maximum update depth exceeded".
  function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null);
    setActiveStatusId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (isColumnDragId(activeId)) {
      handleColumnDragEnd(activeId, overId);
      return;
    }

    const fromStatus = findColumnOf(activeId);
    if (!fromStatus) return;

    const toStatus = orderedStatuses.find((s) => s.id === overId)?.id ?? findColumnOf(overId);
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
        { ...card, statusId: toStatus },
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
      statusId: toStatus,
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
      [updated.statusId]: (prev[updated.statusId] ?? []).map((c) => (c.id === updated.id ? updated : c)),
    }));
    // El Drawer sigue leyendo `selectedCard` (no la lista `columns`) mientras
    // está abierto — sin esto, subir una imagen no se vería reflejada ahí
    // hasta cerrar y volver a abrir el Drawer.
    setSelectedCard((prev) => (prev && prev.id === updated.id ? updated : prev));
  }

  function handleDeleted(deliverableId: string) {
    setColumns((prev) => {
      const next = { ...prev };
      for (const status of Object.keys(next)) {
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
          onToggleClient={onToggleClient}
          onSelectAllClients={onSelectAllClients}
          onSelectNoClients={onSelectNoClients}
          tipoFilter={tipoFilter}
          onTipoFilterChange={onTipoFilterChange}
        />

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Ordenar:</span>
          <div className="flex rounded-lg border p-0.5">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onSortModeChange(opt.value)}
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
          <SortableContext
            items={orderedStatuses.map((s) => columnDragId(s.id))}
            strategy={horizontalListSortingStrategy}
          >
            {orderedStatuses.map((status) => (
              <KanbanColumn
                key={status.id}
                id={status.id}
                title={status.nombre}
                color={status.color}
                items={sortItems(columns[status.id] ?? [], sortMode)}
                onCardClick={handleCardClick}
                isVisible={isCardVisible}
              />
            ))}
          </SortableContext>

          <AddColumnButton />
        </div>

        <DragOverlay>
          {activeCard ? <DeliverableCard deliverable={activeCard} onClick={() => {}} /> : null}
          {activeStatusId ? <ColumnDragPreview status={orderedStatuses.find((s) => s.id === activeStatusId)} /> : null}
        </DragOverlay>
      </DndContext>

      <DeliverableDrawer
        deliverable={selectedCard}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
        bankAccounts={bankAccounts}
        statuses={orderedStatuses}
      />
    </>
  );
}

/** Vista fantasma que sigue al cursor mientras se arrastra una columna. */
function ColumnDragPreview({ status }: { status: PipelineStatusOption | undefined }) {
  if (!status) return null;
  return (
    <div className="flex w-[82vw] items-center gap-2 rounded-2xl bg-muted/40 px-3 py-3 shadow-lg sm:w-72 md:w-80">
      <span className="size-2 rounded-full" style={{ backgroundColor: status.color }} aria-hidden />
      <h3 className="text-sm font-semibold">{status.nombre}</h3>
    </div>
  );
}

function groupByStatus(
  deliverables: DeliverableCardData[],
  statuses: PipelineStatusOption[]
): Record<string, DeliverableCardData[]> {
  const base: Record<string, DeliverableCardData[]> = {};
  for (const status of statuses) base[status.id] = [];
  for (const d of deliverables) {
    if (!base[d.statusId]) base[d.statusId] = [];
    base[d.statusId].push(d);
  }
  for (const statusId of Object.keys(base)) {
    base[statusId].sort((a, b) => a.orden - b.orden);
  }
  return base;
}
