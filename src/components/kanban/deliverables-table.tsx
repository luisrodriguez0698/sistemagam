"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDownIcon,
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  DownloadIcon,
  LinkIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/confirm-provider";
import { deleteDeliverable } from "@/actions/deliverables";
import { DeliverableDrawer } from "./deliverable-drawer";
import { NewDeliverableDrawer } from "./new-deliverable-drawer";
import { KanbanFilters } from "./kanban-filters";
import { TIPO_ACCENT, TIPO_ICON, TIPO_LABEL } from "@/lib/deliverable-tipo";
import { formatDateOnly } from "@/lib/date-only";
import type { BankAccountOption, DeliverableCardData } from "./kanban-board";
import type { DeliverableStatus, DeliverableType } from "@prisma/client";

const STATUS_LABEL: Record<DeliverableStatus, string> = {
  EN_PROCESO: "En proceso",
  REVISION_CLIENTE: "Revisión",
  APROBADO: "Aprobado",
  PUBLICADO: "Publicado",
};

const STATUS_STYLE: Record<DeliverableStatus, string> = {
  EN_PROCESO: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  REVISION_CLIENTE: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  APROBADO: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  PUBLICADO: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

export interface ClientQuota {
  id: string;
  nombreNegocio: string;
  colorHex: string;
  videosMensuales: number;
  disenosMensuales: number;
}

interface DeliverablesTableProps {
  deliverables: DeliverableCardData[];
  clients: ClientQuota[];
  anio: number;
  mes: number;
  bankAccounts: BankAccountOption[];
}

export function DeliverablesTable({ deliverables, clients, anio, mes, bankAccounts }: DeliverablesTableProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [, startTransition] = useTransition();
  const [selectedCard, setSelectedCard] = React.useState<DeliverableCardData | null>(null);
  const [editDrawerOpen, setEditDrawerOpen] = React.useState(false);
  const [newDrawerOpen, setNewDrawerOpen] = React.useState(false);
  const [newDrawerClientId, setNewDrawerClientId] = React.useState<string | undefined>(undefined);
  const [tipoFilter, setTipoFilter] = React.useState<DeliverableType | "ALL">("ALL");
  const [selectedClientIds, setSelectedClientIds] = React.useState<Set<string>>(
    () => new Set(clients.map((c) => c.id))
  );
  const [collapsedClientIds, setCollapsedClientIds] = React.useState<Set<string>>(() => new Set());

  const byClient = new Map<string, DeliverableCardData[]>();
  for (const d of deliverables) {
    byClient.set(d.clientId, [...(byClient.get(d.clientId) ?? []), d]);
  }

  function openEdit(deliverable: DeliverableCardData) {
    setSelectedCard(deliverable);
    setEditDrawerOpen(true);
  }

  function openNew(clientId: string) {
    setNewDrawerClientId(clientId);
    setNewDrawerOpen(true);
  }

  async function handleDelete(deliverable: DeliverableCardData) {
    const ok = await confirm({
      title: `¿Eliminar "${deliverable.titulo}"?`,
      confirmText: "Eliminar",
      variant: "destructive",
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteDeliverable(deliverable.id);
      router.refresh();
    });
  }

  function toggleCollapsed(clientId: string) {
    setCollapsedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  }

  const visibleClients = clients.filter((c) => selectedClientIds.has(c.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <KanbanFilters
          clients={clients}
          selectedClientIds={selectedClientIds}
          onToggleClient={(clientId) =>
            setSelectedClientIds((prev) => {
              const next = new Set(prev);
              if (next.has(clientId)) next.delete(clientId);
              else next.add(clientId);
              return next;
            })
          }
          onSelectAllClients={() => setSelectedClientIds(new Set(clients.map((c) => c.id)))}
          onSelectNoClients={() => setSelectedClientIds(new Set())}
          tipoFilter={tipoFilter}
          onTipoFilterChange={setTipoFilter}
        />

        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-xs"
            onClick={() => setCollapsedClientIds(new Set())}
          >
            <ChevronsUpDownIcon className="size-3.5" />
            Expandir todos
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-xs"
            onClick={() => setCollapsedClientIds(new Set(clients.map((c) => c.id)))}
          >
            <ChevronsDownUpIcon className="size-3.5" />
            Colapsar todos
          </Button>
        </div>
      </div>

      {visibleClients.map((client) => {
        const allItems = (byClient.get(client.id) ?? []).sort((a, b) => a.titulo.localeCompare(b.titulo));
        const items = allItems.filter((d) => tipoFilter === "ALL" || d.tipo === tipoFilter);
        const videosCount = allItems.filter((d) => d.tipo === "VIDEO" && !d.esExtra).length;
        const disenosCount = allItems.filter((d) => d.tipo === "DISENO" && !d.esExtra).length;
        const isCollapsed = collapsedClientIds.has(client.id);

        return (
          <div key={client.id} className="overflow-hidden rounded-2xl border">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/40 px-4 py-3">
              <button
                type="button"
                onClick={() => toggleCollapsed(client.id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <ChevronDownIcon
                  className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isCollapsed && "-rotate-90")}
                />
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 font-semibold">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: client.colorHex }}
                      aria-hidden
                    />
                    {client.nombreNegocio}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {videosCount}/{client.videosMensuales} videos · {disenosCount}/{client.disenosMensuales} diseños
                  </p>
                </div>
              </button>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="gap-1" asChild>
                  <a href={`/api/clientes/${client.id}/parrilla?anio=${anio}&mes=${mes}`} target="_blank" rel="noreferrer">
                    <DownloadIcon className="size-4" />
                    Descargar parrilla
                  </a>
                </Button>
                <Button size="sm" variant="outline" className="gap-1" asChild>
                  <a href={`/api/clientes/${client.id}/resumen?anio=${anio}&mes=${mes}`} target="_blank" rel="noreferrer">
                    <DownloadIcon className="size-4" />
                    Descargar resumen
                  </a>
                </Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => openNew(client.id)}>
                  <PlusIcon className="size-4" />
                  Agregar entregable
                </Button>
              </div>
            </div>

            {isCollapsed ? null : items.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Sin entregables este mes todavía.</p>
            ) : (
              <div className="divide-y">
                {items.map((item) => {
                  const TipoIcon = TIPO_ICON[item.tipo];
                  return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/30"
                  >
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-md",
                        TIPO_ACCENT[item.tipo].badgeClassName
                      )}
                      title={TIPO_LABEL[item.tipo]}
                    >
                      <TipoIcon className="size-3.5" />
                    </span>

                    {item.archivoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- imagen externa (R2)
                      <img src={item.archivoUrl} alt="" className="size-8 shrink-0 rounded object-cover" />
                    ) : (
                      <span className="flex size-8 shrink-0 items-center justify-center text-muted-foreground">
                        <TipoIcon className="size-4" />
                      </span>
                    )}

                    <button
                      onClick={() => openEdit(item)}
                      className="min-w-0 flex-1 truncate text-left font-medium hover:underline"
                    >
                      {item.titulo}
                    </button>

                    {item.linkEjemplo && (
                      <a
                        href={item.linkEjemplo}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        aria-label="Abrir link de ejemplo"
                      >
                        <LinkIcon className="size-4" />
                      </a>
                    )}

                    {item.esExtra && (
                      <>
                        <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                          Extra
                        </span>
                        {item.montoExtra != null && (
                          <span className="shrink-0 text-xs font-medium">
                            {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
                              item.montoExtra
                            )}
                          </span>
                        )}
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                            item.estatusPagoExtra === "PAGADO"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          )}
                        >
                          {item.estatusPagoExtra === "PAGADO" ? "Pagado" : "Pendiente"}
                        </span>
                      </>
                    )}

                    {item.fechaEntrega && (
                      <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                        {formatDateOnly(item.fechaEntrega)}
                      </span>
                    )}

                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                        STATUS_STYLE[item.estado]
                      )}
                    >
                      {STATUS_LABEL[item.estado]}
                    </span>

                    <button
                      onClick={() => handleDelete(item)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label="Eliminar entregable"
                    >
                      <Trash2Icon className="size-4" />
                    </button>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <DeliverableDrawer
        deliverable={selectedCard}
        open={editDrawerOpen}
        onOpenChange={setEditDrawerOpen}
        onSaved={(updated) => {
          // El Drawer sigue leyendo `selectedCard` mientras está abierto;
          // sin esto, subir una imagen no se vería hasta cerrar y reabrir.
          setSelectedCard(updated);
          router.refresh();
        }}
        onDeleted={() => router.refresh()}
        bankAccounts={bankAccounts}
      />

      <NewDeliverableDrawer
        open={newDrawerOpen}
        onOpenChange={setNewDrawerOpen}
        clients={clients}
        defaultClientId={newDrawerClientId}
        anio={anio}
        mes={mes}
        bankAccounts={bankAccounts}
      />
    </div>
  );
}
