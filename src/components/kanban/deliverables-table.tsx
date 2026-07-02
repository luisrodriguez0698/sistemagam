"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { DownloadIcon, ImageIcon, LinkIcon, PlusIcon, Trash2Icon, VideoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { deleteDeliverable } from "@/actions/deliverables";
import { DeliverableDrawer } from "./deliverable-drawer";
import { NewDeliverableDrawer } from "./new-deliverable-drawer";
import type { BankAccountOption, DeliverableCardData } from "./kanban-board";
import type { DeliverableStatus } from "@prisma/client";

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
  const [, startTransition] = useTransition();
  const [selectedCard, setSelectedCard] = React.useState<DeliverableCardData | null>(null);
  const [editDrawerOpen, setEditDrawerOpen] = React.useState(false);
  const [newDrawerOpen, setNewDrawerOpen] = React.useState(false);
  const [newDrawerClientId, setNewDrawerClientId] = React.useState<string | undefined>(undefined);

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

  function handleDelete(deliverable: DeliverableCardData) {
    if (!window.confirm(`¿Eliminar "${deliverable.titulo}"?`)) return;
    startTransition(async () => {
      await deleteDeliverable(deliverable.id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {clients.map((client) => {
        const items = (byClient.get(client.id) ?? []).sort((a, b) => a.titulo.localeCompare(b.titulo));
        const videosCount = items.filter((d) => d.tipo === "VIDEO" && !d.esExtra).length;
        const disenosCount = items.filter((d) => d.tipo === "DISENO" && !d.esExtra).length;

        return (
          <div key={client.id} className="overflow-hidden rounded-2xl border">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/40 px-4 py-3">
              <div>
                <p className="font-semibold">{client.nombreNegocio}</p>
                <p className="text-xs text-muted-foreground">
                  {videosCount}/{client.videosMensuales} videos · {disenosCount}/{client.disenosMensuales} diseños
                </p>
              </div>
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

            {items.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Sin entregables este mes todavía.</p>
            ) : (
              <div className="divide-y">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/30"
                  >
                    {item.archivoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- imagen externa (R2)
                      <img src={item.archivoUrl} alt="" className="size-8 shrink-0 rounded object-cover" />
                    ) : (
                      <span className="flex size-8 shrink-0 items-center justify-center text-muted-foreground">
                        {item.tipo === "VIDEO" ? <VideoIcon className="size-4" /> : <ImageIcon className="size-4" />}
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
                        {new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short" }).format(
                          new Date(item.fechaEntrega)
                        )}
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
                ))}
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
