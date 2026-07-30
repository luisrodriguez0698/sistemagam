"use client";

import * as React from "react";
import { ArrowRightLeftIcon, LayoutGridIcon, PlusIcon, SettingsIcon, TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PipelineStatusOption } from "@/lib/pipeline-status";
import { MonthSwitcher } from "./month-switcher";
import { GenerateDeliverablesButton } from "./generate-deliverables-button";
import { KanbanBoard, type BankAccountOption, type DeliverableCardData, type SortMode } from "./kanban-board";
import type { ClientFilterOption } from "./kanban-filters";
import { DeliverablesTable, type ClientQuota } from "./deliverables-table";
import { NewDeliverableDrawer } from "./new-deliverable-drawer";
import { MoveMonthDrawer } from "./move-month-drawer";
import { StatusManagerDrawer } from "./status-manager-drawer";
import type { DeliverableType } from "@prisma/client";

interface EntregablesViewProps {
  year: number;
  month: number;
  deliverables: DeliverableCardData[];
  clients: ClientQuota[];
  bankAccounts: BankAccountOption[];
  statuses: PipelineStatusOption[];
  /** Permite deep-linkear directo a la Parrilla, ej. desde un entregable del Calendario. */
  initialView?: "board" | "table";
}

export function EntregablesView({
  year,
  month,
  deliverables,
  clients,
  bankAccounts,
  statuses,
  initialView = "board",
}: EntregablesViewProps) {
  const [view, setView] = React.useState<"board" | "table">(initialView);
  const [newDrawerOpen, setNewDrawerOpen] = React.useState(false);
  const [moveDrawerOpen, setMoveDrawerOpen] = React.useState(false);
  const [statusDrawerOpen, setStatusDrawerOpen] = React.useState(false);

  // Filtros/orden del Tablero viven aquí (no dentro de KanbanBoard) para
  // que sobrevivan cuando llegan datos frescos del servidor — antes
  // KanbanBoard se remontaba por completo en cada cambio y eso reseteaba
  // los filtros con solo arrastrar una tarjeta.
  const clientOptions = React.useMemo<ClientFilterOption[]>(() => {
    const seen = new Map<string, ClientFilterOption>();
    for (const d of deliverables) {
      if (!seen.has(d.clientId)) {
        seen.set(d.clientId, { id: d.clientId, nombreNegocio: d.clienteNombre, colorHex: d.clienteColor });
      }
    }
    return [...seen.values()].sort((a, b) => a.nombreNegocio.localeCompare(b.nombreNegocio));
  }, [deliverables]);

  const [selectedClientIds, setSelectedClientIds] = React.useState<Set<string>>(
    () => new Set(clientOptions.map((c) => c.id))
  );
  const [tipoFilter, setTipoFilter] = React.useState<DeliverableType | "ALL">("ALL");
  const [sortMode, setSortMode] = React.useState<SortMode>("MANUAL");

  // Si aparece un cliente nuevo en la lista (ej. se le crea su primer
  // entregable del mes), se agrega ya marcado por defecto, sin resetear la
  // selección que el usuario ya haya hecho para los demás.
  React.useEffect(() => {
    setSelectedClientIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const c of clientOptions) {
        if (!next.has(c.id)) {
          next.add(c.id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [clientOptions]);

  function toggleClient(clientId: string) {
    setSelectedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthSwitcher year={year} month={month} />

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border p-0.5">
            <button
              onClick={() => setView("board")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                view === "board" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <LayoutGridIcon className="size-4" />
              Tablero
            </button>
            <button
              onClick={() => setView("table")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <TableIcon className="size-4" />
              Parrilla
            </button>
          </div>

          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setNewDrawerOpen(true)}>
            <PlusIcon className="size-4" />
            Nuevo entregable
          </Button>

          <GenerateDeliverablesButton anio={year} mes={month} clients={clients} deliverables={deliverables} />

          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setMoveDrawerOpen(true)}>
            <ArrowRightLeftIcon className="size-4" />
            Mover a otro mes
          </Button>

          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setStatusDrawerOpen(true)}>
            <SettingsIcon className="size-4" />
            Gestionar estatus
          </Button>
        </div>
      </div>

      {view === "board" ? (
        <KanbanBoard
          key={`${year}-${month}`}
          initialDeliverables={deliverables}
          bankAccounts={bankAccounts}
          statuses={statuses}
          clientOptions={clientOptions}
          selectedClientIds={selectedClientIds}
          onToggleClient={toggleClient}
          onSelectAllClients={() => setSelectedClientIds(new Set(clientOptions.map((c) => c.id)))}
          onSelectNoClients={() => setSelectedClientIds(new Set())}
          tipoFilter={tipoFilter}
          onTipoFilterChange={setTipoFilter}
          sortMode={sortMode}
          onSortModeChange={setSortMode}
        />
      ) : (
        <DeliverablesTable
          deliverables={deliverables}
          clients={clients}
          anio={year}
          mes={month}
          bankAccounts={bankAccounts}
          statuses={statuses}
        />
      )}

      <NewDeliverableDrawer
        open={newDrawerOpen}
        onOpenChange={setNewDrawerOpen}
        clients={clients}
        anio={year}
        mes={month}
        bankAccounts={bankAccounts}
      />

      <MoveMonthDrawer
        open={moveDrawerOpen}
        onOpenChange={setMoveDrawerOpen}
        anio={year}
        mes={month}
        deliverables={deliverables}
      />

      <StatusManagerDrawer
        open={statusDrawerOpen}
        onOpenChange={setStatusDrawerOpen}
        statuses={statuses}
      />
    </div>
  );
}
