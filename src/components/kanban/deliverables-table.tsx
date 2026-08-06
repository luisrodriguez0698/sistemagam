"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDownIcon,
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  CopyPlusIcon,
  DownloadIcon,
  LinkIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/confirm-provider";
import { deleteDeliverable, deleteDeliverables, duplicateDeliverable } from "@/actions/deliverables";
import { DeliverableDrawer } from "./deliverable-drawer";
import { NewDeliverableDrawer } from "./new-deliverable-drawer";
import { ExportDrawer } from "./export-drawer";
import { KanbanFilters } from "./kanban-filters";
import { TIPO_ACCENT, TIPO_ICON, TIPO_LABEL } from "@/lib/deliverable-tipo";
import { statusBadgeStyle, type PipelineStatusOption } from "@/lib/pipeline-status";
import { formatDateOnly } from "@/lib/date-only";
import type { BankAccountOption, DeliverableCardData } from "./kanban-board";
import type { DeliverableType } from "@prisma/client";

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
  statuses: PipelineStatusOption[];
}

export function DeliverablesTable({
  deliverables,
  clients,
  anio,
  mes,
  bankAccounts,
  statuses,
}: DeliverablesTableProps) {
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
  const [exportDrawerClient, setExportDrawerClient] = React.useState<ClientQuota | null>(null);
  // IDs marcados para borrado masivo — vive en un solo Set (no por cliente)
  // porque nada impide, en teoría, tener marcados entregables de más de un
  // cliente a la vez; el botón "Eliminar seleccionados" de cada cliente solo
  // actúa sobre los suyos.
  const [selectedForDeleteIds, setSelectedForDeleteIds] = React.useState<Set<string>>(() => new Set());

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

  async function handleDuplicate(deliverable: DeliverableCardData) {
    const ok = await confirm({
      title: `¿Duplicar "${deliverable.titulo}"?`,
      description: "Se crea una copia al final de la misma columna, sin las imágenes — súbelas de nuevo si aplica.",
      confirmText: "Duplicar",
    });
    if (!ok) return;
    startTransition(async () => {
      await duplicateDeliverable(deliverable.id);
      router.refresh();
    });
  }

  function toggleSelectedForDelete(id: string) {
    setSelectedForDeleteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllForClient(items: DeliverableCardData[], allSelected: boolean) {
    setSelectedForDeleteIds((prev) => {
      const next = new Set(prev);
      for (const item of items) {
        if (allSelected) next.delete(item.id);
        else next.add(item.id);
      }
      return next;
    });
  }

  async function handleBulkDelete(items: DeliverableCardData[]) {
    if (items.length === 0) return;
    const ok = await confirm({
      title: `¿Eliminar ${items.length} entregable${items.length === 1 ? "" : "s"}?`,
      description: "Esta acción no se puede deshacer.",
      confirmText: "Eliminar",
      variant: "destructive",
    });
    if (!ok) return;
    const ids = items.map((item) => item.id);
    startTransition(async () => {
      await deleteDeliverables({ deliverableIds: ids });
      setSelectedForDeleteIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
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
        const selectedCountForClient = items.filter((item) => selectedForDeleteIds.has(item.id)).length;
        const allSelectedForClient = items.length > 0 && selectedCountForClient === items.length;

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
              <div className="flex flex-wrap items-center gap-2">
                {selectedCountForClient > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-destructive hover:text-destructive"
                    onClick={() => handleBulkDelete(items.filter((item) => selectedForDeleteIds.has(item.id)))}
                  >
                    <Trash2Icon className="size-4" />
                    Eliminar ({selectedCountForClient})
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => setExportDrawerClient(client)}
                >
                  <DownloadIcon className="size-4" />
                  Descargar
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
                <label className="flex items-center gap-3 px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/30">
                  <input
                    type="checkbox"
                    checked={allSelectedForClient}
                    onChange={() => toggleSelectAllForClient(items, allSelectedForClient)}
                    className="size-3.5"
                  />
                  Seleccionar todos
                </label>
                {items.map((item) => {
                  const TipoIcon = TIPO_ICON[item.tipo];
                  return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/30"
                  >
                    <input
                      type="checkbox"
                      checked={selectedForDeleteIds.has(item.id)}
                      onChange={() => toggleSelectedForDelete(item.id)}
                      className="size-3.5 shrink-0"
                      aria-label={`Seleccionar "${item.titulo}"`}
                    />
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

                    {item.linksEjemplo.length > 0 && (
                      <a
                        href={item.linksEjemplo[0]}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        aria-label={
                          item.linksEjemplo.length > 1
                            ? `Abrir el primero de ${item.linksEjemplo.length} links de ejemplo`
                            : "Abrir link de ejemplo"
                        }
                        title={item.linksEjemplo.length > 1 ? `${item.linksEjemplo.length} links de ejemplo` : undefined}
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

                    {(() => {
                      const status = statuses.find((s) => s.id === item.statusId);
                      return (
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                          style={statusBadgeStyle(status?.color ?? "#6b7280")}
                        >
                          {status?.nombre ?? "—"}
                        </span>
                      );
                    })()}

                    <button
                      onClick={() => handleDuplicate(item)}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                      aria-label="Duplicar entregable"
                      title="Duplicar"
                    >
                      <CopyPlusIcon className="size-4" />
                    </button>

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
        statuses={statuses}
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

      <ExportDrawer
        open={!!exportDrawerClient}
        onOpenChange={(nextOpen) => !nextOpen && setExportDrawerClient(null)}
        clientId={exportDrawerClient?.id ?? ""}
        clienteNombre={exportDrawerClient?.nombreNegocio ?? ""}
        anio={anio}
        mes={mes}
        deliverables={exportDrawerClient ? byClient.get(exportDrawerClient.id) ?? [] : []}
      />
    </div>
  );
}
