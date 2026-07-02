"use client";

import * as React from "react";
import { LayoutGridIcon, PlusIcon, TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MonthSwitcher } from "./month-switcher";
import { GenerateDeliverablesButton } from "./generate-deliverables-button";
import { KanbanBoard, type BankAccountOption, type DeliverableCardData } from "./kanban-board";
import { DeliverablesTable, type ClientQuota } from "./deliverables-table";
import { NewDeliverableDrawer } from "./new-deliverable-drawer";

interface EntregablesViewProps {
  year: number;
  month: number;
  deliverables: DeliverableCardData[];
  clients: ClientQuota[];
  bankAccounts: BankAccountOption[];
}

export function EntregablesView({ year, month, deliverables, clients, bankAccounts }: EntregablesViewProps) {
  const [view, setView] = React.useState<"board" | "table">("board");
  const [newDrawerOpen, setNewDrawerOpen] = React.useState(false);

  // Fuerza a KanbanBoard a reinicializar su estado interno cuando cambian
  // el mes o el contenido de los entregables (agregar/editar/eliminar desde
  // la parrilla no debería quedar "atrás" del estado optimista del tablero).
  const boardVersion = `${deliverables.length}-${deliverables.reduce(
    (max, d) => Math.max(max, new Date(d.updatedAt).getTime()),
    0
  )}`;

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

          <GenerateDeliverablesButton anio={year} mes={month} />
        </div>
      </div>

      {view === "board" ? (
        <KanbanBoard
          key={`${year}-${month}-${boardVersion}`}
          initialDeliverables={deliverables}
          bankAccounts={bankAccounts}
        />
      ) : (
        <DeliverablesTable
          deliverables={deliverables}
          clients={clients}
          anio={year}
          mes={month}
          bankAccounts={bankAccounts}
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
    </div>
  );
}
